import { executeRun, queryAll, queryFirst, withDbTransaction } from '../db/database';
import { Book, Chapter } from '../types';
import { BookRow, ChapterRow } from '../types/database';
import { generateId } from '../utils/idUtils';

type BookJoinedRow = BookRow & { next_book_title: string | null; chapter_count: number };

const BOOK_SELECT = `
  SELECT b.*, nb.title AS next_book_title,
    (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.is_archived = 0) AS chapter_count
  FROM books b
  LEFT JOIN books nb ON nb.id = b.next_book_id
`;

export function mapBook(r: BookJoinedRow): Book {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    nextBookId: r.next_book_id,
    nextBookTitle: r.next_book_title,
    sortOrder: r.sort_order,
    isArchived: r.is_archived === 1,
    chapterCount: r.chapter_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapChapter(r: ChapterRow): Chapter {
  return {
    id: r.id,
    bookId: r.book_id,
    title: r.title,
    sortOrder: r.sort_order,
    isArchived: r.is_archived === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Rewrites sort_order as 1..n in the given order. */
async function writeOrder(table: 'books' | 'chapters', ids: string[]): Promise<void> {
  const now = new Date().toISOString();
  await withDbTransaction(async () => {
    for (let i = 0; i < ids.length; i++) {
      await executeRun(`UPDATE ${table} SET sort_order = ?, updated_at = ? WHERE id = ?;`, [
        i + 1,
        now,
        ids[i],
      ]);
    }
  });
}

function swap<T>(list: T[], index: number, direction: 'up' | 'down'): T[] | null {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return null;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export const BookService = {
  // ================= BOOKS =================

  async getBooks(includeArchived = false): Promise<Book[]> {
    const rows = await queryAll<BookJoinedRow>(
      `${BOOK_SELECT}
       ${includeArchived ? '' : 'WHERE b.is_archived = 0'}
       ORDER BY b.sort_order ASC, b.title ASC;`
    );
    return rows.map(mapBook);
  },

  async getBookById(id: string): Promise<Book | null> {
    const row = await queryFirst<BookJoinedRow>(`${BOOK_SELECT} WHERE b.id = ?;`, [id]);
    return row ? mapBook(row) : null;
  },

  async createBook(data: { title: string; description?: string | null }): Promise<Book> {
    const id = generateId();
    const now = new Date().toISOString();
    const max = await queryFirst<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM books;');
    await executeRun(
      `INSERT INTO books (id, title, description, next_book_id, sort_order, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, 0, ?, ?);`,
      [id, data.title.trim(), data.description?.trim() || null, (max?.m ?? 0) + 1, now, now]
    );
    const book = await this.getBookById(id);
    if (!book) throw new Error('Failed to create book.');
    return book;
  },

  async updateBook(
    id: string,
    data: { title: string; description?: string | null; nextBookId: string | null }
  ): Promise<void> {
    if (data.nextBookId === id) throw new Error('A book cannot be promoted to itself.');
    const now = new Date().toISOString();
    await executeRun(
      'UPDATE books SET title = ?, description = ?, next_book_id = ?, updated_at = ? WHERE id = ?;',
      [data.title.trim(), data.description?.trim() || null, data.nextBookId, now, id]
    );
  },

  /**
   * Hides a book from the curriculum and from new assignments. Students keep their history.
   */
  async archiveBook(id: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun('UPDATE books SET is_archived = 1, updated_at = ? WHERE id = ?;', [now, id]);
  },

  async unarchiveBook(id: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun('UPDATE books SET is_archived = 0, updated_at = ? WHERE id = ?;', [now, id]);
  },

  async moveBook(id: string, direction: 'up' | 'down'): Promise<void> {
    const books = await this.getBooks(false);
    const reordered = swap(books, books.findIndex((b) => b.id === id), direction);
    if (reordered) await writeOrder('books', reordered.map((b) => b.id));
  },

  // ================= CHAPTERS =================

  async getChapters(bookId: string): Promise<Chapter[]> {
    const rows = await queryAll<ChapterRow>(
      `SELECT * FROM chapters WHERE book_id = ? AND is_archived = 0
       ORDER BY sort_order ASC, title ASC;`,
      [bookId]
    );
    return rows.map(mapChapter);
  },

  /** Adds a chapter at the end of the book. */
  async addChapter(bookId: string, title: string): Promise<void> {
    const now = new Date().toISOString();
    const max = await queryFirst<{ m: number | null }>(
      'SELECT MAX(sort_order) AS m FROM chapters WHERE book_id = ?;',
      [bookId]
    );
    await executeRun(
      `INSERT INTO chapters (id, book_id, title, sort_order, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?);`,
      [generateId(), bookId, title.trim(), (max?.m ?? 0) + 1, now, now]
    );
  },

  async renameChapter(id: string, title: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun('UPDATE chapters SET title = ?, updated_at = ? WHERE id = ?;', [
      title.trim(),
      now,
      id,
    ]);
  },

  /**
   * Hides a chapter for all students; their past ratings stay in history.
   */
  async archiveChapter(id: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun('UPDATE chapters SET is_archived = 1, updated_at = ? WHERE id = ?;', [
      now,
      id,
    ]);
  },

  async moveChapter(bookId: string, id: string, direction: 'up' | 'down'): Promise<void> {
    const chapters = await this.getChapters(bookId);
    const reordered = swap(chapters, chapters.findIndex((c) => c.id === id), direction);
    if (reordered) await writeOrder('chapters', reordered.map((c) => c.id));
  },
};
