import { executeRun, queryAll, queryFirst } from '../db/database';
import { AppSettingRow } from '../types/database';

export const SettingsService = {
  async getSetting(key: string, defaultValue = ''): Promise<string> {
    const row = await queryFirst<AppSettingRow>(
      'SELECT key, value FROM app_settings WHERE key = ?;',
      [key]
    );
    return row ? row.value : defaultValue;
  },

  async setSetting(key: string, value: string): Promise<void> {
    await executeRun(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value]
    );
  },

  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await queryAll<AppSettingRow>('SELECT key, value FROM app_settings;');
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  },
};
