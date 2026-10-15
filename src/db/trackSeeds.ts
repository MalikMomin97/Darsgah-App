/**
 * Default content for the fixed maktab tracks (Qaida, Quran Nazira, Surah Hifz, Book).
 * Everything seeded here is editable afterwards from the Curriculum tab.
 */

export const QAIDA_LESSON_COUNT = 17;

/** Short surahs in the usual maktab memorization order, with ayah counts. */
export const DEFAULT_SURAHS: { title: string; ayahs: number }[] = [
  { title: 'Al-Fatiha', ayahs: 7 },
  { title: 'An-Nas', ayahs: 6 },
  { title: 'Al-Falaq', ayahs: 5 },
  { title: 'Al-Ikhlas', ayahs: 4 },
  { title: 'Al-Masad', ayahs: 5 },
  { title: 'An-Nasr', ayahs: 3 },
  { title: 'Al-Kafirun', ayahs: 6 },
  { title: 'Al-Kawthar', ayahs: 3 },
  { title: "Al-Ma'un", ayahs: 7 },
  { title: 'Quraysh', ayahs: 4 },
  { title: 'Al-Fil', ayahs: 5 },
  { title: 'Al-Humazah', ayahs: 9 },
  { title: "Al-'Asr", ayahs: 3 },
  { title: 'At-Takathur', ayahs: 8 },
  { title: "Al-Qari'ah", ayahs: 11 },
  { title: "Al-'Adiyat", ayahs: 11 },
  { title: 'Az-Zalzalah', ayahs: 8 },
  { title: 'Al-Bayyinah', ayahs: 8 },
  { title: 'Al-Qadr', ayahs: 5 },
  { title: "Al-'Alaq", ayahs: 19 },
  { title: 'At-Tin', ayahs: 8 },
  { title: 'Ash-Sharh', ayahs: 8 },
  { title: 'Ad-Duha', ayahs: 11 },
  { title: 'Yaseen', ayahs: 83 },
  { title: 'Al-Mulk', ayahs: 30 },
  { title: 'Ar-Rahman', ayahs: 78 },
  { title: "Al-Waqi'ah", ayahs: 96 },
];

export const DEFAULT_BOOK_SECTIONS = [
  'Dua',
  'Hadees',
  'Arabic',
  'Aqaid',
  'Seerat-e-Paak',
  'Fiqh',
  'Akhlaqiyat',
  'Seerat-e-Awliya',
  'Sunnat',
];

export const DEFAULT_QURAN_PAGES_PER_PARA = 20;
