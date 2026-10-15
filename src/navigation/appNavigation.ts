import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { RootStackParamList, RouteName } from '../types/navigation';

/** Expo Router path for each named screen (files live in src/app). */
export const ROUTE_PATHS: Record<RouteName, string> = {
  Dashboard: '/',
  StudentList: '/students',
  BookList: '/curriculum',
  DailyAttendance: '/attendance',
  MonthlyReports: '/reports',
  StudentForm: '/student-form',
  StudentProfile: '/student-profile',
  StudentLearning: '/student-learning',
  DailyProgress: '/daily-sabak',
  GroupList: '/groups',
  GroupForm: '/group-form',
  GroupDetail: '/group-detail',
  BookDetail: '/book-detail',
  AttendanceHistory: '/attendance-history',
  ReportPreview: '/report-preview',
  Settings: '/settings',
  BackupRestore: '/backup-restore',
};

type ParamsArgs<K extends RouteName> = undefined extends RootStackParamList[K]
  ? [params?: RootStackParamList[K]]
  : [params: RootStackParamList[K]];

/** Drops undefined values so they don't reach the URL as the string "undefined". */
function toSearchParams(params: object | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}

export function navigateTo<K extends RouteName>(name: K, ...args: ParamsArgs<K>): void {
  router.push({ pathname: ROUTE_PATHS[name] as any, params: toSearchParams(args[0]) });
}

/**
 * Navigation helpers for screens. `navigate` and `push` both open a new screen on top.
 */
export function useAppNavigation() {
  const navigation = useNavigation();
  return {
    navigate: navigateTo,
    push: navigateTo,
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/')),
    dispatch: navigation.dispatch,
  };
}

/**
 * Typed access to the current screen's params, shaped like React Navigation's `route`.
 * Params arrive as strings; every param in RootStackParamList is a string.
 */
export function useAppRoute<K extends RouteName>(): { params: RootStackParamList[K] } {
  const params = useLocalSearchParams();
  return { params: params as unknown as RootStackParamList[K] };
}
