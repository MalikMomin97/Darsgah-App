/**
 * Default books created by migration v3. All of them are editable from the Curriculum tab.
 * `next` links a book to the one a student is promoted to after finishing it.
 */
export interface SeedBook {
  key: string;
  title: string;
  chapters: string[];
  next?: string;
}

const range = (n: number, label: string) => Array.from({ length: n }, (_, i) => `${label} ${i + 1}`);

export const DEFAULT_BOOKS: SeedBook[] = [
  { key: 'qaida', title: 'Qaida', chapters: range(17, 'Lesson'), next: 'quran' },
  { key: 'quran', title: 'Quran (Nazira)', chapters: range(30, 'Para') },
  {
    key: 'surah',
    title: 'Surah (Hifz)',
    chapters: [
      'Al-Fatiha',
      'An-Nas',
      'Al-Falaq',
      'Al-Ikhlas',
      'Al-Masad',
      'An-Nasr',
      'Al-Kafirun',
      'Al-Kawthar',
      "Al-Ma'un",
      'Quraysh',
      'Al-Fil',
      'Al-Humazah',
      "Al-'Asr",
      'At-Takathur',
      "Al-Qari'ah",
      "Al-'Adiyat",
      'Az-Zalzalah',
      'Al-Bayyinah',
      'Al-Qadr',
      "Al-'Alaq",
      'At-Tin',
      'Ash-Sharh',
      'Ad-Duha',
      'Yaseen',
      'Al-Mulk',
      'Ar-Rahman',
      "Al-Waqi'ah",
    ],
  },
  {
    key: 'diniyat1',
    title: 'Diniyat Part 1',
    chapters: [
      'Dua',
      'Hadees',
      'Arabic',
      'Aqaid',
      'Seerat-e-Paak',
      'Fiqh',
      'Akhlaqiyat',
      'Seerat-e-Awliya',
      'Sunnat',
    ],
  },
];
