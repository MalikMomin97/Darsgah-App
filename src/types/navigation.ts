/**
 * Every navigable screen and its params. Route names map to Expo Router paths
 * in src/navigation/appNavigation.ts; params travel as URL search params.
 */
export type RootStackParamList = {
  // Tabs
  Dashboard: undefined;
  StudentList: undefined;
  BookList: undefined;
  DailyAttendance: { groupId?: string; date?: string } | undefined;
  MonthlyReports: undefined;

  // Student & Progress Screens
  StudentForm: { studentId?: string };
  StudentProfile: { studentId: string };
  StudentLearning: { studentId: string };
  DailyProgress: { groupId?: string; date?: string; studentId?: string } | undefined;

  // Group Screens
  GroupList: undefined;
  GroupForm: { groupId?: string };
  GroupDetail: { groupId: string };

  // Curriculum (Books) Screens
  BookDetail: { bookId: string };

  // Attendance Screens
  AttendanceHistory: { studentId?: string; groupId?: string };

  // Report Screens
  ReportPreview: { type: 'student' | 'group'; targetId: string; monthYear: string };

  // Settings & System
  Settings: undefined;
  BackupRestore: undefined;
};

export type RouteName = keyof RootStackParamList;
