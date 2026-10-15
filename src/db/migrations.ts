import { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../utils/idUtils';
import {
  QAIDA_LESSON_COUNT,
  DEFAULT_SURAHS,
  DEFAULT_BOOK_SECTIONS,
  DEFAULT_QURAN_PAGES_PER_PARA,
} from './trackSeeds';
import { DEFAULT_BOOKS } from './bookSeeds';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema_v1',
    up: async (db: SQLiteDatabase) => {
      // 1. App Settings Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // 2. Groups Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          sort_order INTEGER DEFAULT 0,
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_groups_archived ON groups(is_archived);
      `);

      // 3. Students Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          admission_number TEXT UNIQUE,
          full_name TEXT NOT NULL,
          gender TEXT,
          date_of_birth TEXT,
          guardian_name TEXT,
          contact_phone TEXT,
          address TEXT,
          notes TEXT,
          current_group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
          registration_date TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_students_group ON students(current_group_id);
        CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active, is_archived);
        CREATE INDEX IF NOT EXISTS idx_students_name ON students(full_name);
      `);

      // 4. Student Group History Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS student_group_history (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          joined_date TEXT NOT NULL,
          left_date TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sgh_student ON student_group_history(student_id);
        CREATE INDEX IF NOT EXISTS idx_sgh_group ON student_group_history(group_id);
      `);

      // 5. Subjects Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT,
          icon TEXT,
          description TEXT,
          sort_order INTEGER DEFAULT 0,
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_subjects_archived ON subjects(is_archived);
      `);

      // 6. Curriculum Nodes (Infinite Dynamic Tree Hierarchy)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS curriculum_nodes (
          id TEXT PRIMARY KEY,
          subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
          parent_id TEXT REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
          node_type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          sort_order INTEGER DEFAULT 0,
          is_leaf INTEGER DEFAULT 0,
          item_type TEXT DEFAULT 'standard',
          max_score REAL,
          expected_answer TEXT,
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cn_subject ON curriculum_nodes(subject_id);
        CREATE INDEX IF NOT EXISTS idx_cn_parent ON curriculum_nodes(parent_id);
        CREATE INDEX IF NOT EXISTS idx_cn_leaf ON curriculum_nodes(is_leaf);
        CREATE INDEX IF NOT EXISTS idx_cn_archived ON curriculum_nodes(is_archived);
      `);

      // 7. Student Progress Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS student_progress (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'not_started',
          assessment_result TEXT DEFAULT 'not_assessed',
          score REAL,
          max_score REAL,
          teacher_remarks TEXT,
          revision_required INTEGER DEFAULT 0,
          assessed_date TEXT,
          completion_date TEXT,
          updated_at TEXT NOT NULL,
          UNIQUE(student_id, node_id)
        );
        CREATE INDEX IF NOT EXISTS idx_sp_student ON student_progress(student_id);
        CREATE INDEX IF NOT EXISTS idx_sp_node ON student_progress(node_id);
        CREATE INDEX IF NOT EXISTS idx_sp_status ON student_progress(status);
        CREATE INDEX IF NOT EXISTS idx_sp_revision ON student_progress(revision_required);
      `);

      // 8. Progress History / Audit Log Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS progress_history (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          assessment_result TEXT,
          score REAL,
          teacher_remarks TEXT,
          revision_required INTEGER DEFAULT 0,
          recorded_date TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ph_student ON progress_history(student_id);
        CREATE INDEX IF NOT EXISTS idx_ph_node ON progress_history(node_id);
        CREATE INDEX IF NOT EXISTS idx_ph_date ON progress_history(recorded_date);
      `);

      // 9. Attendance Records Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS attendance_records (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(student_id, date)
        );
        CREATE INDEX IF NOT EXISTS idx_att_date ON attendance_records(date);
        CREATE INDEX IF NOT EXISTS idx_att_student ON attendance_records(student_id);
        CREATE INDEX IF NOT EXISTS idx_att_group ON attendance_records(group_id);
      `);

      // 10. Default settings
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?);`,
        ['institution_name', 'Darsgah Islamic Institute']
      );
      await db.runAsync(
        `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?);`,
        ['academic_session', '2026-2027']
      );
      await db.runAsync(
        `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?);`,
        ['initialized_at', now]
      );
    },
  },
  {
    version: 2,
    name: 'maktab_tracks_v2',
    up: async (db: SQLiteDatabase) => {
      // 1. Track type on subjects: fixed maktab tracks vs. free-form custom subjects
      await db.execAsync(`
        ALTER TABLE subjects ADD COLUMN track_type TEXT NOT NULL DEFAULT 'custom';
        CREATE INDEX IF NOT EXISTS idx_subjects_track ON subjects(track_type);
      `);

      // 2. Ayah count for surah items
      await db.execAsync(`ALTER TABLE curriculum_nodes ADD COLUMN ayah_count INTEGER;`);

      // 3. Reading stage per student: qaida -> quran -> completed
      await db.execAsync(
        `ALTER TABLE students ADD COLUMN reading_stage TEXT NOT NULL DEFAULT 'qaida';`
      );

      // 4. Daily lessons: one row per student, per date, per slot.
      //    slot = track for qaida/quran/surah, and 'book:<sectionId>' for book sections.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS daily_lessons (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
          date TEXT NOT NULL,
          track TEXT NOT NULL,
          slot TEXT NOT NULL,
          node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE SET NULL,
          section_id TEXT REFERENCES curriculum_nodes(id) ON DELETE SET NULL,
          para_from INTEGER,
          page_from INTEGER,
          para_to INTEGER,
          page_to INTEGER,
          ayah_from INTEGER,
          ayah_to INTEGER,
          mistakes INTEGER,
          result TEXT NOT NULL,
          is_completed INTEGER NOT NULL DEFAULT 0,
          remarks TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(student_id, date, slot)
        );
        CREATE INDEX IF NOT EXISTS idx_dl_date ON daily_lessons(date);
        CREATE INDEX IF NOT EXISTS idx_dl_student_track ON daily_lessons(student_id, track, date);
        CREATE INDEX IF NOT EXISTS idx_dl_node ON daily_lessons(node_id);
      `);

      // 5. Seed the four fixed track subjects with their default content
      const now = new Date().toISOString();
      const insertSubject = async (name: string, track: string, icon: string, sort: number) => {
        const id = generateId();
        await db.runAsync(
          `INSERT INTO subjects (id, name, code, icon, description, sort_order, is_archived, created_at, updated_at, track_type)
           VALUES (?, ?, NULL, ?, NULL, ?, 0, ?, ?, ?);`,
          [id, name, icon, sort, now, now, track]
        );
        return id;
      };
      const insertNode = async (
        subjectId: string,
        parentId: string | null,
        nodeType: string,
        title: string,
        sort: number,
        isLeaf: boolean,
        ayahCount: number | null = null
      ) => {
        const id = generateId();
        await db.runAsync(
          `INSERT INTO curriculum_nodes (
            id, subject_id, parent_id, node_type, title, description, sort_order, is_leaf,
            item_type, max_score, expected_answer, is_archived, created_at, updated_at, ayah_count
          ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'standard', NULL, NULL, 0, ?, ?, ?);`,
          [id, subjectId, parentId, nodeType, title, sort, isLeaf ? 1 : 0, now, now, ayahCount]
        );
        return id;
      };

      const qaidaId = await insertSubject('Qaida', 'qaida', 'qaida', -40);
      for (let i = 1; i <= QAIDA_LESSON_COUNT; i++) {
        await insertNode(qaidaId, null, 'lesson', `Lesson ${i}`, i, true);
      }

      await insertSubject('Quran (Nazira)', 'quran', 'quran', -30);

      const surahId = await insertSubject('Surah (Hifz)', 'surah', 'surah', -20);
      for (let i = 0; i < DEFAULT_SURAHS.length; i++) {
        const s = DEFAULT_SURAHS[i];
        await insertNode(surahId, null, 'surah', s.title, i + 1, true, s.ayahs);
      }

      const bookId = await insertSubject('Book', 'book', 'book', -10);
      for (let i = 0; i < DEFAULT_BOOK_SECTIONS.length; i++) {
        await insertNode(bookId, null, 'section', DEFAULT_BOOK_SECTIONS[i], i + 1, false);
      }

      await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?);`, [
        'quran_pages_per_para',
        String(DEFAULT_QURAN_PAGES_PER_PARA),
      ]);
    },
  },
  {
    version: 3,
    name: 'books_and_chapters_v3',
    up: async (db: SQLiteDatabase) => {
      // 1. Retire the subject/curriculum-tree model and all progress recorded with it
      await db.execAsync(`
        DROP TABLE IF EXISTS daily_lessons;
        DROP TABLE IF EXISTS progress_history;
        DROP TABLE IF EXISTS student_progress;
        DROP TABLE IF EXISTS curriculum_nodes;
        DROP TABLE IF EXISTS subjects;
        DELETE FROM app_settings WHERE key = 'quran_pages_per_para';
      `);
      // Reading stage is replaced by assigning books (Qaida -> Quran via book promotion)
      await db.execAsync(`ALTER TABLE students DROP COLUMN reading_stage;`);

      // 2. Books and their chapters (teaching order = sort_order)
      await db.execAsync(`
        CREATE TABLE books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          next_book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE chapters (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX idx_chapters_book ON chapters(book_id, is_archived, sort_order);
      `);

      // 3. Books assigned to students; a finished book is kept as 'completed'
      await db.execAsync(`
        CREATE TABLE student_books (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'active',
          assigned_date TEXT NOT NULL,
          completed_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(student_id, book_id)
        );
        CREATE INDEX idx_student_books_student ON student_books(student_id, status);
      `);

      // 4. Daily chapter ratings: one entry per student, chapter and date
      await db.execAsync(`
        CREATE TABLE lesson_log (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
          group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
          date TEXT NOT NULL,
          rating TEXT NOT NULL,
          is_completed INTEGER NOT NULL DEFAULT 0,
          remarks TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(student_id, chapter_id, date)
        );
        CREATE INDEX idx_lesson_log_student ON lesson_log(student_id, book_id, date);
        CREATE INDEX idx_lesson_log_date ON lesson_log(date);
      `);

      // 5. Default books
      const now = new Date().toISOString();
      const ids: Record<string, string> = {};
      for (let b = 0; b < DEFAULT_BOOKS.length; b++) {
        const book = DEFAULT_BOOKS[b];
        ids[book.key] = generateId();
        await db.runAsync(
          `INSERT INTO books (id, title, description, next_book_id, sort_order, is_archived, created_at, updated_at)
           VALUES (?, ?, NULL, NULL, ?, 0, ?, ?);`,
          [ids[book.key], book.title, b + 1, now, now]
        );
        for (let c = 0; c < book.chapters.length; c++) {
          await db.runAsync(
            `INSERT INTO chapters (id, book_id, title, sort_order, is_archived, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, ?, ?);`,
            [generateId(), ids[book.key], book.chapters[c], c + 1, now, now]
          );
        }
      }
      for (const book of DEFAULT_BOOKS) {
        if (book.next) {
          await db.runAsync('UPDATE books SET next_book_id = ? WHERE id = ?;', [
            ids[book.next],
            ids[book.key],
          ]);
        }
      }
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure migration tracking table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Query already applied versions
  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[DB] Applying migration ${migration.version}: ${migration.name}`);
      // Atomic: a failed migration rolls back fully so it can be retried on next launch
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.runAsync(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, new Date().toISOString()]
        );
      });
      console.log(`[DB] Migration ${migration.version} applied successfully.`);
    }
  }
}
