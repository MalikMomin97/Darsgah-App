import { executeRun, queryAll, queryFirst, withDbTransaction } from '../db/database';
import {
  AttendanceStatus,
  Book,
  Chapter,
  LearningSummary,
  LessonEntry,
  Rating,
  Student,
  StudentBook,
  StudentBookProgress,
  StudentChapter,
} from '../types';
import { BookRow, ChapterRow, LessonLogRow, StudentBookRow } from '../types/database';
import { generateId } from '../utils/idUtils';
import { getTodayDateString } from '../utils/dateUtils';
import { mapBook, mapChapter } from './bookService';
import { StudentService } from './studentService';

export const RATINGS: Rating[] = ['excellent', 'good', 'needs_improvement', 'bad'];

export const RATING_LABELS: Record<Rating, string> = {
  excellent: 'Excellent',
  good: 'Good',
  needs_improvement: 'Needs Improvement',
  bad: 'Bad',
};

export interface LessonInput {
  bookId: string;
  chapterId: string;
  rating: Rating;
  isCompleted: boolean;
  remarks?: string | null;
}

export interface StudentLearningDay {
  student: Student;
  attendance: AttendanceStatus | null;
  /** Active books with chapter standing as of the selected date. */
  books: StudentBookProgress[];
  /** Entries recorded on the selected date. */
  entries: LessonEntry[];
}

type LessonJoinedRow = LessonLogRow & { book_title: string | null; chapter_title: string | null };

const LESSON_SELECT = `
  SELECT l.*, b.title AS book_title, c.title AS chapter_title
  FROM lesson_log l
  LEFT JOIN books b ON b.id = l.book_id
  LEFT JOIN chapters c ON c.id = l.chapter_id
`;

function mapLesson(r: LessonJoinedRow): LessonEntry {
  return {
    id: r.id,
    studentId: r.student_id,
    bookId: r.book_id,
    bookTitle: r.book_title ?? undefined,
    chapterId: r.chapter_id,
    chapterTitle: r.chapter_title ?? undefined,
    groupId: r.group_id,
    date: r.date,
    rating: r.rating as Rating,
    isCompleted: r.is_completed === 1,
    remarks: r.remarks,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapAssignment(r: StudentBookRow): StudentBook {
  return {
    id: r.id,
    studentId: r.student_id,
    bookId: r.book_id,
    status: r.status === 'completed' ? 'completed' : 'active',
    assignedDate: r.assigned_date,
    completedDate: r.completed_date,
  };
}

const placeholders = (n: number) => Array.from({ length: n }, () => '?').join(',');

/**
 * Combines a book's chapters with a student's entries (any order) into per-chapter standing.
 */
function buildProgress(
  assignment: StudentBook,
  book: Book,
  chapters: Chapter[],
  entries: LessonEntry[]
): StudentBookProgress {
  // newest first
  const sorted = [...entries].sort((a, b) =>
    a.date === b.date ? b.updatedAt.localeCompare(a.updatedAt) : b.date.localeCompare(a.date)
  );
  const completedIds = new Set(sorted.filter((e) => e.isCompleted).map((e) => e.chapterId));

  const studentChapters: StudentChapter[] = chapters.map((c) => {
    const last = sorted.find((e) => e.chapterId === c.id);
    return {
      ...c,
      status: completedIds.has(c.id) ? 'completed' : last ? 'in_progress' : 'not_started',
      lastRating: last?.rating ?? null,
      lastDate: last?.date ?? null,
    };
  });

  const latest = sorted.find((e) => chapters.some((c) => c.id === e.chapterId));
  const currentChapterId =
    latest && !completedIds.has(latest.chapterId)
      ? latest.chapterId
      : studentChapters.find((c) => c.status !== 'completed')?.id ?? null;

  return {
    assignment,
    book,
    chapters: studentChapters,
    completedCount: studentChapters.filter((c) => c.status === 'completed').length,
    currentChapterId,
  };
}

/**
 * Loads assignments of the given students with their books, chapters and entries up to `upToDate`.
 */
async function loadProgress(
  studentIds: string[],
  options: { activeOnly: boolean; upToDate?: string }
): Promise<Map<string, StudentBookProgress[]>> {
  const result = new Map<string, StudentBookProgress[]>();
  if (studentIds.length === 0) return result;

  const assignments = (
    await queryAll<StudentBookRow>(
      `SELECT * FROM student_books
       WHERE student_id IN (${placeholders(studentIds.length)})
       ${options.activeOnly ? "AND status = 'active'" : ''}
       ORDER BY assigned_date ASC, created_at ASC;`,
      studentIds
    )
  ).map(mapAssignment);
  if (assignments.length === 0) return result;

  const bookIds = Array.from(new Set(assignments.map((a) => a.bookId)));
  const books = (
    await queryAll<BookRow & { next_book_title: string | null; chapter_count: number }>(
      `SELECT b.*, nb.title AS next_book_title,
         (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.is_archived = 0) AS chapter_count
       FROM books b LEFT JOIN books nb ON nb.id = b.next_book_id
       WHERE b.id IN (${placeholders(bookIds.length)});`,
      bookIds
    )
  ).map(mapBook);
  const chapters = (
    await queryAll<ChapterRow>(
      `SELECT * FROM chapters
       WHERE book_id IN (${placeholders(bookIds.length)}) AND is_archived = 0
       ORDER BY sort_order ASC, title ASC;`,
      bookIds
    )
  ).map(mapChapter);
  const entries = (
    await queryAll<LessonJoinedRow>(
      `${LESSON_SELECT}
       WHERE l.student_id IN (${placeholders(studentIds.length)})
         AND l.book_id IN (${placeholders(bookIds.length)})
         ${options.upToDate ? 'AND l.date <= ?' : ''};`,
      [...studentIds, ...bookIds, ...(options.upToDate ? [options.upToDate] : [])]
    )
  ).map(mapLesson);

  for (const a of assignments) {
    const book = books.find((b) => b.id === a.bookId);
    if (!book) continue;
    const progress = buildProgress(
      a,
      book,
      chapters.filter((c) => c.bookId === a.bookId),
      entries.filter((e) => e.studentId === a.studentId && e.bookId === a.bookId)
    );
    result.set(a.studentId, [...(result.get(a.studentId) || []), progress]);
  }
  return result;
}

async function upsertLesson(
  studentId: string,
  groupId: string | null,
  date: string,
  l: LessonInput,
  now: string
): Promise<void> {
  await executeRun(
    `INSERT INTO lesson_log (
       id, student_id, book_id, chapter_id, group_id, date, rating, is_completed, remarks, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(student_id, chapter_id, date) DO UPDATE SET
       book_id = excluded.book_id,
       group_id = excluded.group_id,
       rating = excluded.rating,
       is_completed = excluded.is_completed,
       remarks = excluded.remarks,
       updated_at = excluded.updated_at;`,
    [
      generateId(),
      studentId,
      l.bookId,
      l.chapterId,
      groupId,
      date,
      l.rating,
      l.isCompleted ? 1 : 0,
      l.remarks?.trim() || null,
      now,
      now,
    ]
  );
}

async function assignBookRow(studentId: string, bookId: string, date: string, now: string) {
  await executeRun(
    `INSERT INTO student_books (id, student_id, book_id, status, assigned_date, completed_date, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, NULL, ?, ?)
     ON CONFLICT(student_id, book_id) DO UPDATE SET
       status = 'active', completed_date = NULL, updated_at = excluded.updated_at;`,
    [generateId(), studentId, bookId, date, now, now]
  );
}

export const LearningService = {
  // ================= ASSIGNMENTS =================

  /** All books of a student (active first), with chapter standing. */
  async getStudentBooks(studentId: string): Promise<StudentBookProgress[]> {
    const map = await loadProgress([studentId], { activeOnly: false });
    const list = map.get(studentId) || [];
    return [
      ...list.filter((p) => p.assignment.status === 'active'),
      ...list.filter((p) => p.assignment.status === 'completed'),
    ];
  },

  async assignBook(studentId: string, bookId: string): Promise<void> {
    await assignBookRow(studentId, bookId, getTodayDateString(), new Date().toISOString());
  },

  /** Removes a book from a student. Ratings already recorded stay in the history. */
  async unassignBook(studentId: string, bookId: string): Promise<void> {
    await executeRun('DELETE FROM student_books WHERE student_id = ? AND book_id = ?;', [
      studentId,
      bookId,
    ]);
  },

  /**
   * Marks the book completed for the student and assigns its next book (if configured).
   * Returns the next book's title, or null when the book has no next book.
   */
  async promote(studentId: string, bookId: string): Promise<string | null> {
    const next = await queryFirst<{ id: string; title: string; is_archived: number }>(
      `SELECT nb.id, nb.title, nb.is_archived FROM books b
       JOIN books nb ON nb.id = b.next_book_id WHERE b.id = ?;`,
      [bookId]
    );
    const today = getTodayDateString();
    const now = new Date().toISOString();
    await withDbTransaction(async () => {
      await executeRun(
        `UPDATE student_books SET status = 'completed', completed_date = ?, updated_at = ?
         WHERE student_id = ? AND book_id = ?;`,
        [today, now, studentId, bookId]
      );
      if (next && next.is_archived === 0) {
        await assignBookRow(studentId, next.id, today, now);
      }
    });
    return next && next.is_archived === 0 ? next.title : null;
  },

  // ================= DAILY ENTRIES =================

  /** Records (or updates) one chapter rating for a student on a date. */
  async recordLesson(
    studentId: string,
    date: string,
    lesson: LessonInput,
    groupId: string | null = null
  ): Promise<void> {
    await upsertLesson(studentId, groupId, date, lesson, new Date().toISOString());
  },

  async deleteLesson(studentId: string, chapterId: string, date: string): Promise<void> {
    await executeRun('DELETE FROM lesson_log WHERE student_id = ? AND chapter_id = ? AND date = ?;', [
      studentId,
      chapterId,
      date,
    ]);
  },

  async getChapterHistory(studentId: string, chapterId: string): Promise<LessonEntry[]> {
    const rows = await queryAll<LessonJoinedRow>(
      `${LESSON_SELECT} WHERE l.student_id = ? AND l.chapter_id = ?
       ORDER BY l.date DESC, l.updated_at DESC;`,
      [studentId, chapterId]
    );
    return rows.map(mapLesson);
  },

  async getStudentEntries(
    studentId: string,
    options: { startDate?: string; endDate?: string; limit?: number } = {}
  ): Promise<LessonEntry[]> {
    const conditions = ['l.student_id = ?'];
    const params: (string | number)[] = [studentId];
    if (options.startDate) {
      conditions.push('l.date >= ?');
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push('l.date <= ?');
      params.push(options.endDate);
    }
    const rows = await queryAll<LessonJoinedRow>(
      `${LESSON_SELECT} WHERE ${conditions.join(' AND ')}
       ORDER BY l.date DESC, l.updated_at DESC
       ${options.limit ? `LIMIT ${Math.floor(options.limit)}` : ''};`,
      params
    );
    return rows.map(mapLesson);
  },

  // ================= GROUP DAY =================

  /**
   * Every active student in a group with attendance, active books (standing as of `date`)
   * and the entries recorded on `date`.
   */
  async getGroupDay(date: string, groupId: string): Promise<StudentLearningDay[]> {
    const students = await StudentService.getStudents({
      groupId,
      isActive: true,
      includeArchived: false,
    });
    if (students.length === 0) return [];
    const ids = students.map((s) => s.id);

    const [attendance, progress, entryRows] = await Promise.all([
      queryAll<{ student_id: string; status: string }>(
        `SELECT student_id, status FROM attendance_records
         WHERE date = ? AND student_id IN (${placeholders(ids.length)});`,
        [date, ...ids]
      ),
      loadProgress(ids, { activeOnly: true, upToDate: date }),
      queryAll<LessonJoinedRow>(
        `${LESSON_SELECT} WHERE l.date = ? AND l.student_id IN (${placeholders(ids.length)})
         ORDER BY l.created_at ASC;`,
        [date, ...ids]
      ),
    ]);
    const entries = entryRows.map(mapLesson);

    return students.map((student) => ({
      student,
      attendance:
        (attendance.find((a) => a.student_id === student.id)?.status as AttendanceStatus) || null,
      books: progress.get(student.id) || [],
      entries: entries.filter((e) => e.studentId === student.id),
    }));
  },

  /**
   * Saves a group's day in one transaction: upserts rated chapters and removes
   * entries the teacher cleared or moved to another chapter.
   */
  async saveGroupDay(
    date: string,
    groupId: string,
    students: { studentId: string; upserts: LessonInput[]; removeChapterIds: string[] }[]
  ): Promise<void> {
    const now = new Date().toISOString();
    await withDbTransaction(async () => {
      for (const s of students) {
        for (const chapterId of s.removeChapterIds) {
          await executeRun(
            'DELETE FROM lesson_log WHERE student_id = ? AND chapter_id = ? AND date = ?;',
            [s.studentId, chapterId, date]
          );
        }
        for (const lesson of s.upserts) {
          await upsertLesson(s.studentId, groupId, date, lesson, now);
        }
      }
    });
  },

  // ================= SUMMARIES =================

  async getLearningSummary(
    studentId: string,
    startDate: string,
    endDate: string
  ): Promise<LearningSummary> {
    const entries = await this.getStudentEntries(studentId, { startDate, endDate });
    const completedBooks = await queryAll<{ title: string }>(
      `SELECT b.title FROM student_books sb JOIN books b ON b.id = sb.book_id
       WHERE sb.student_id = ? AND sb.status = 'completed'
         AND sb.completed_date >= ? AND sb.completed_date <= ?
       ORDER BY sb.completed_date ASC;`,
      [studentId, startDate, endDate]
    );
    return summarizeEntries(
      entries,
      completedBooks.map((b) => b.title)
    );
  },
};

/** Pure aggregation of entries into a LearningSummary (exported for testing). */
export function summarizeEntries(entries: LessonEntry[], booksCompleted: string[]): LearningSummary {
  const ratingCounts: Record<Rating, number> = {
    excellent: 0,
    good: 0,
    needs_improvement: 0,
    bad: 0,
  };
  const byBook = new Map<string, { studied: Set<string>; completed: Set<string> }>();
  const ordered = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  for (const e of ordered) {
    ratingCounts[e.rating] += 1;
    const key = e.bookTitle || 'Book';
    const bucket = byBook.get(key) || { studied: new Set<string>(), completed: new Set<string>() };
    const chapter = e.chapterTitle || 'Chapter';
    bucket.studied.add(chapter);
    if (e.isCompleted) bucket.completed.add(chapter);
    byBook.set(key, bucket);
  }

  return {
    daysRecorded: new Set(entries.map((e) => e.date)).size,
    ratingCounts,
    books: Array.from(byBook.entries()).map(([bookTitle, b]) => ({
      bookTitle,
      chaptersStudied: Array.from(b.studied),
      chaptersCompleted: Array.from(b.completed),
    })),
    booksCompleted,
  };
}
