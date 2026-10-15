/**
 * Darsgah design system — "Emerald & Gold".
 * Deep emerald brand colour, warm gold accent, ivory canvas, ink text.
 * Fonts are loaded in src/app/_layout.tsx; always style text through `Typography` or
 * `Fonts` (never `fontWeight`: each weight is its own font family on Android).
 */

export const Colors = {
  // Brand
  primary: '#0E5C4A',
  primaryDark: '#083D31',
  primaryDeep: '#062A22',
  primaryMuted: '#3E8C77',
  primaryLight: '#E6F1ED',
  primarySoft: '#F1F7F4',

  accent: '#B8862B', // Gold
  accentDark: '#8C6420',
  accentLight: '#F8EFDB',
  accentGlow: 'rgba(212, 166, 69, 0.18)', // gold haze on emerald gradients

  // Status
  success: '#1F9D6B',
  successLight: '#E3F5EC',
  danger: '#D64545',
  dangerLight: '#FBE9E9',
  dangerTint: '#FFF8F8', // input error fill
  warning: '#D99A06',
  warningLight: '#FDF3DA',
  info: '#2F6FDB',
  infoLight: '#E6EEFC',

  // Neutrals (warm)
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F2EFE8',
  surfaceRaised: '#FBFAF7',
  border: '#EAE5DA',
  borderDark: '#D9D1C2',

  text: '#16211D',
  textSecondary: '#5B6661',
  textMuted: '#9AA29E',
  textInverse: '#FFFFFF',

  overlay: 'rgba(6, 26, 21, 0.55)',

  // Attendance
  present: '#1F9D6B',
  presentBg: '#E3F5EC',
  absent: '#D64545',
  absentBg: '#FBE9E9',
  holiday: '#6A5AE0',
  holidayBg: '#EEECFD',

  // Progress
  notStarted: '#9AA29E',
  notStartedBg: '#F2EFE8',
  inProgress: '#2F6FDB',
  inProgressBg: '#E6EEFC',
  completed: '#1F9D6B',
  completedBg: '#E3F5EC',
  needsImprovement: '#D6455F',
  needsImprovementBg: '#FBE8EC',
};

/** Gradient stops for hero areas and primary buttons (expo-linear-gradient). */
export const Gradients = {
  brand: ['#0E5C4A', '#083D31'] as const,
  brandDeep: ['#11705A', '#062A22'] as const,
  gold: ['#D4A645', '#B8862B'] as const,
};

/** Font family per weight (Plus Jakarta Sans for UI, Amiri for Arabic text). */
export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const Typography = {
  display: {
    fontFamily: Fonts.extrabold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: Colors.text,
  },
  titleLarge: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.4,
    color: Colors.text,
  },
  titleMedium: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: Colors.text,
  },
  titleSmall: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text,
  },
  bodyLarge: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: Colors.text,
  },
  bodyMedium: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    lineHeight: 15,
    color: Colors.textMuted,
  },
  /** Small uppercase section label. */
  overline: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
    color: Colors.textMuted,
  },
  button: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  /** Arabic names (surahs, paras); pair with a size from the surrounding style. */
  arabic: {
    fontFamily: Fonts.arabicBold,
    fontSize: 19,
    lineHeight: 30,
    color: Colors.text,
  },
};

const shadowTint = '#0B2A22';

export const Shadows = {
  sm: {
    shadowColor: shadowTint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: shadowTint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: shadowTint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
};

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** True when the text contains Arabic script (surah / para names). */
export function isArabicText(text: string | null | undefined): boolean {
  return !!text && ARABIC_SCRIPT.test(text);
}

/** Extra style for a title that may be Arabic: switches to the Arabic font at a matching size. */
export function arabicAware(text: string | null | undefined, baseSize = 15) {
  return isArabicText(text)
    ? { fontFamily: Fonts.arabicBold, fontSize: baseSize + 4, lineHeight: (baseSize + 4) * 1.6 }
    : null;
}
