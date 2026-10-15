import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { openDatabaseAsync } from 'expo-sqlite';
import { getDatabase, closeDatabase, DATABASE_NAME, queryAll } from '../db/database';
import { getTodayDateString } from '../utils/dateUtils';

export const BackupService = {
  /**
   * Creates a backup of the current SQLite database and triggers the system share dialog.
   */
  async exportDatabaseFile(): Promise<boolean> {
    const db = await getDatabase();
    // Flush WAL checkpoint to write all transactions into the main .db file
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

    const dbDir = `${FileSystem.documentDirectory}SQLite/`;
    const dbPath = `${dbDir}${DATABASE_NAME}`;

    const info = await FileSystem.getInfoAsync(dbPath);
    if (!info.exists) {
      // Check alternative path directly in documentDirectory
      const altPath = `${FileSystem.documentDirectory}${DATABASE_NAME}`;
      const altInfo = await FileSystem.getInfoAsync(altPath);
      if (!altInfo.exists) {
        throw new Error('Database file could not be located on device.');
      }
    }

    const sourcePath = info.exists ? dbPath : `${FileSystem.documentDirectory}${DATABASE_NAME}`;
    const today = getTodayDateString();
    const backupFileName = `darsgah_backup_${today}.db`;
    const destPath = `${FileSystem.cacheDirectory}${backupFileName}`;

    await FileSystem.copyAsync({
      from: sourcePath,
      to: destPath,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not supported on this device.');
    }

    await Sharing.shareAsync(destPath, {
      mimeType: 'application/x-sqlite3',
      dialogTitle: 'Export Darsgah Database Backup',
      UTI: 'public.database',
    });

    return true;
  },

  /**
   * Exports all database tables as a clean structured JSON file.
   */
  async exportJsonBackup(): Promise<boolean> {
    const tables = {
      settings: 'app_settings',
      groups: 'groups',
      students: 'students',
      groupHistory: 'student_group_history',
      books: 'books',
      chapters: 'chapters',
      studentBooks: 'student_books',
      lessonLog: 'lesson_log',
      attendanceRecords: 'attendance_records',
      holidays: 'holidays',
    };
    const data: Record<string, unknown[]> = {};
    for (const [key, table] of Object.entries(tables)) {
      data[key] = await queryAll(`SELECT * FROM ${table};`);
    }

    const exportData = {
      version: 3,
      exportedAt: new Date().toISOString(),
      data,
    };

    const today = getTodayDateString();
    const fileName = `darsgah_data_export_${today}.json`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2));

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not supported on this device.');
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Export Darsgah Data (JSON)',
      UTI: 'public.json',
    });

    return true;
  },

  /**
   * Prompts the user to pick a SQLite .db backup file and restores it.
   *
   * The picked file is validated (SQLite header, integrity check, Darsgah tables) as a
   * separate database before anything is touched. The current database is then closed,
   * kept as a rollback copy, and replaced together with its WAL side files.
   */
  async restoreDatabaseFile(): Promise<boolean> {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*',
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return false;
    }

    const sourceUri = result.assets[0].uri;

    // 1. Cheap check: first 16 bytes must be the SQLite magic header
    const header = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 16,
    });
    if (header !== SQLITE_HEADER_BASE64) {
      throw new Error(
        'This file is not a Darsgah database backup (.db). JSON exports cannot be restored.'
      );
    }

    const dbDir = `${FileSystem.documentDirectory}SQLite/`;
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    const targetPath = `${dbDir}${DATABASE_NAME}`;
    const candidatePath = `${dbDir}${RESTORE_CANDIDATE_NAME}`;
    const rollbackPath = `${dbDir}${DATABASE_NAME}.pre-restore`;

    // 2. Open the candidate as its own database and verify it before touching live data
    await deleteDbFiles(candidatePath);
    await FileSystem.copyAsync({ from: sourceUri, to: candidatePath });
    try {
      const candidate = await openDatabaseAsync(RESTORE_CANDIDATE_NAME);
      try {
        const integrity = await candidate.getFirstAsync<{ integrity_check: string }>(
          'PRAGMA integrity_check;'
        );
        if (integrity?.integrity_check !== 'ok') {
          throw new Error('The backup file is damaged (integrity check failed).');
        }
        const tables = await candidate.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table';"
        );
        const names = new Set(tables.map((t) => t.name));
        if (!REQUIRED_TABLES.every((t) => names.has(t))) {
          throw new Error('This database is not a Darsgah backup.');
        }
        // Fold any WAL content into the main file so a plain file move is complete
        await candidate.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      } finally {
        await candidate.closeAsync();
      }
    } catch (e) {
      await deleteDbFiles(candidatePath);
      throw e;
    }

    // 3. Swap files with the live database closed, keeping a rollback copy
    await closeDatabase();
    await deleteDbFiles(rollbackPath);
    const liveInfo = await FileSystem.getInfoAsync(targetPath);
    if (liveInfo.exists) {
      await FileSystem.copyAsync({ from: targetPath, to: rollbackPath });
    }
    await deleteDbFiles(targetPath);
    await FileSystem.moveAsync({ from: candidatePath, to: targetPath });
    await deleteDbFiles(candidatePath);

    // 4. Reopen (runs migrations for older backups); roll back if that fails
    try {
      await getDatabase();
    } catch {
      await closeDatabase();
      await deleteDbFiles(targetPath);
      if (liveInfo.exists) {
        await FileSystem.moveAsync({ from: rollbackPath, to: targetPath });
      }
      await getDatabase();
      throw new Error('Restore failed and your previous data was kept.');
    }

    await deleteDbFiles(rollbackPath);
    return true;
  },
};

const SQLITE_HEADER_BASE64 = 'U1FMaXRlIGZvcm1hdCAzAA=='; // "SQLite format 3\0"
const RESTORE_CANDIDATE_NAME = 'restore_candidate.db';
// Present in every Darsgah backup version; newer tables are created by migrations on reopen
const REQUIRED_TABLES = ['students', 'groups', 'attendance_records', 'schema_migrations'];

/** Deletes a database file together with its -wal / -shm / -journal side files. */
async function deleteDbFiles(path: string): Promise<void> {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    await FileSystem.deleteAsync(`${path}${suffix}`, { idempotent: true });
  }
}
