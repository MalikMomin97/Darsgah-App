export const Colors = {
  primary: '#0F5132', // Deep Islamic Forest Green
  primaryLight: '#E8F5E9',
  primaryDark: '#0A3622',
  primaryMuted: '#2E7D32',

  accent: '#D97706', // Warm Amber / Ochre
  accentLight: '#FEF3C7',

  // Status colors
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Neutral colors
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Attendance specific
  present: '#16A34A',
  presentBg: '#DCFCE7',
  absent: '#DC2626',
  absentBg: '#FEE2E2',
  late: '#F59E0B',
  lateBg: '#FEF3C7',
  excused: '#6366F1',
  excusedBg: '#EEF2FF',

  // Progress specific
  notStarted: '#94A3B8',
  notStartedBg: '#F1F5F9',
  inProgress: '#0284C7',
  inProgressBg: '#E0F2FE',
  completed: '#16A34A',
  completedBg: '#DCFCE7',
  needsImprovement: '#E11D48',
  needsImprovementBg: '#FFE4E6',
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  titleLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    color: Colors.text,
  },
  titleMedium: {
    fontSize: 19,
    fontWeight: '600' as const,
    lineHeight: 25,
    color: Colors.text,
  },
  titleSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: Colors.text,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: Colors.text,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.text,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    color: Colors.textMuted,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
};
