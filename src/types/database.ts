// Database row representations

export interface MigrationRow {
  version: number;
  name: string;
  applied_at: string;
}

export interface AppSettingRow {
  key: string;
  value: string;
}

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface StudentRow {
  id: string;
  admission_number: string | null;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  guardian_name: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  current_group_id: string | null;
  registration_date: string;
  is_active: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface StudentGroupHistoryRow {
  id: string;
  student_id: string;
  group_id: string;
  joined_date: string;
  left_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface AttendanceRecordRow {
  id: string;
  date: string; // YYYY-MM-DD
  student_id: string;
  group_id: string;
  status: string; // 'present' | 'absent' | 'late' | 'excused'
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookRow {
  id: string;
  title: string;
  description: string | null;
  next_book_id: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface ChapterRow {
  id: string;
  book_id: string;
  title: string;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface StudentBookRow {
  id: string;
  student_id: string;
  book_id: string;
  status: string; // 'active' | 'completed'
  assigned_date: string;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonLogRow {
  id: string;
  student_id: string;
  book_id: string;
  chapter_id: string;
  group_id: string | null;
  date: string; // YYYY-MM-DD
  rating: string; // 'excellent' | 'good' | 'needs_improvement' | 'bad'
  is_completed: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}
