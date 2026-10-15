import { openDatabaseAsync, SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';
import { runMigrations } from './migrations';

export const DATABASE_NAME = 'darsgah_master.db';

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Initializes and returns the shared SQLite database instance.
 * Enables WAL mode and foreign key constraints.
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await openDatabaseAsync(DATABASE_NAME);

      // Configure SQLite pragmas for optimal mobile performance and data integrity
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // Run schema migrations
      await runMigrations(db);

      dbInstance = db;
      return db;
    } catch (error) {
      initPromise = null;
      console.error('[DB] Failed to initialize database:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Convenience helper to execute a SELECT query returning all matching rows.
 */
export async function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  return db.getAllAsync<T>(sql, params);
}

/**
 * Convenience helper to execute a SELECT query returning the first matching row or null.
 */
export async function queryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
  const db = await getDatabase();
  return db.getFirstAsync<T>(sql, params);
}

/**
 * Convenience helper to execute an INSERT, UPDATE, or DELETE query.
 */
export async function executeRun(sql: string, params: any[] = []): Promise<SQLiteRunResult> {
  const db = await getDatabase();
  return db.runAsync(sql, params);
}

/**
 * Convenience helper to execute multiple statements inside an ACID transaction.
 */
export async function withDbTransaction(callback: () => Promise<void>): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(callback);
}

/**
 * Closes the shared connection so the database file can be safely replaced (backup restore).
 * The next getDatabase() call reopens it and re-runs migrations.
 */
export async function closeDatabase(): Promise<void> {
  const db = dbInstance ?? (initPromise ? await initPromise.catch(() => null) : null);
  dbInstance = null;
  initPromise = null;
  if (db) {
    await db.closeAsync();
  }
}
