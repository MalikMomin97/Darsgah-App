export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  admissionNumber: string | null;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  guardianName: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  currentGroupId: string | null;
  groupName?: string | null;
  registrationDate: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentGroupHistory {
  id: string;
  studentId: string;
  groupId: string;
  groupName?: string;
  joinedDate: string;
  leftDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName?: string;
  groupId: string;
  groupName?: string;
  status: AttendanceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

/** Daily rating of a chapter. */
export type Rating = 'excellent' | 'good' | 'needs_improvement' | 'bad';

export type ChapterStatus = 'not_started' | 'in_progress' | 'completed';

export interface Book {
  id: string;
  title: string;
  description: string | null;
  /** Book a student is promoted to after finishing this one (e.g. Part 1 -> Part 2). */
  nextBookId: string | null;
  nextBookTitle?: string | null;
  sortOrder: number;
  isArchived: boolean;
  chapterCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentBook {
  id: string;
  studentId: string;
  bookId: string;
  status: 'active' | 'completed';
  assignedDate: string;
  completedDate: string | null;
}

export interface LessonEntry {
  id: string;
  studentId: string;
  bookId: string;
  bookTitle?: string;
  chapterId: string;
  chapterTitle?: string;
  groupId: string | null;
  date: string; // YYYY-MM-DD
  rating: Rating;
  isCompleted: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A chapter as seen for one student. */
export interface StudentChapter extends Chapter {
  status: ChapterStatus;
  lastRating: Rating | null;
  lastDate: string | null;
}

/** A book assigned to a student, with per-chapter standing. */
export interface StudentBookProgress {
  assignment: StudentBook;
  book: Book;
  chapters: StudentChapter[];
  completedCount: number;
  /** Chapter to study next: the latest unfinished one, else the first not completed. */
  currentChapterId: string | null;
}

/** Learning activity of one student over a date range. */
export interface LearningSummary {
  daysRecorded: number;
  ratingCounts: Record<Rating, number>;
  books: {
    bookTitle: string;
    chaptersStudied: string[];
    chaptersCompleted: string[];
  }[];
  booksCompleted: string[];
}

/** Monthly learning result: average of daily ratings, its grade and the teacher's remarks. */
export interface PerformanceSummary {
  /** 0–100, or null when no lesson was rated in the period. */
  learningPercentage: number | null;
  grade: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement' | 'Weak' | null;
  /** Parent-facing remarks generated from learning and attendance. */
  remarks: string;
}

export interface StudentMonthlyReport {
  student: Student;
  monthYear: string; // e.g., '2026-10'
  attendance: AttendanceSummary;
  learning: LearningSummary;
  performance: PerformanceSummary;
}

export interface GroupMonthlyReport {
  group: Group;
  monthYear: string;
  studentCount: number;
  averageAttendancePercentage: number;
  /** Average over students who had lessons rated, or null if none. */
  averageLearningPercentage: number | null;
  studentSummaries: {
    student: Student;
    attendance: AttendanceSummary;
    learning: LearningSummary;
    performance: PerformanceSummary;
  }[];
}
