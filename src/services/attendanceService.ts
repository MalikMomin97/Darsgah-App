import { executeRun, queryAll, withDbTransaction } from '../db/database';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  Student,
} from '../types';
import { AttendanceRecordRow, StudentRow } from '../types/database';
import { generateId } from '../utils/idUtils';

export interface GroupAttendanceEntry {
  student: Student;
  status: AttendanceStatus;
  notes: string | null;
  recordId: string | null;
}

export const AttendanceService = {
  /**
   * Retrieves all students belonging to a group along with their attendance status for a given date.
   */
  async getAttendanceForDateAndGroup(
    date: string,
    groupId: string
  ): Promise<GroupAttendanceEntry[]> {
    // 1. Get all active, non-archived students currently assigned to this group
    const studentsSql = `
      SELECT s.*, g.name AS group_name
      FROM students s
      LEFT JOIN groups g ON s.current_group_id = g.id
      WHERE s.current_group_id = ? AND s.is_archived = 0 AND s.is_active = 1
      ORDER BY s.full_name ASC;
    `;
    const studentRows = await queryAll<StudentRow & { group_name: string | null }>(
      studentsSql,
      [groupId]
    );

    // 2. Get attendance already entered on this date for these students
    //    (matched by student, so a student moved between groups keeps their mark)
    const attSql = `
      SELECT ar.* FROM attendance_records ar
      JOIN students s ON s.id = ar.student_id
      WHERE ar.date = ? AND s.current_group_id = ?;
    `;
    const attRows = await queryAll<AttendanceRecordRow>(attSql, [date, groupId]);
    const attMap = new Map<string, AttendanceRecordRow>();
    attRows.forEach((r) => attMap.set(r.student_id, r));

    return studentRows.map((s) => {
      const existing = attMap.get(s.id);
      return {
        student: {
          id: s.id,
          admissionNumber: s.admission_number,
          fullName: s.full_name,
          gender: s.gender,
          dateOfBirth: s.date_of_birth,
          guardianName: s.guardian_name,
          contactPhone: s.contact_phone,
          address: s.address,
          notes: s.notes,
          currentGroupId: s.current_group_id,
          groupName: s.group_name,
          registrationDate: s.registration_date,
          isActive: s.is_active === 1,
          isArchived: s.is_archived === 1,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        },
        status: (existing?.status as AttendanceStatus) || 'present',
        notes: existing?.notes || null,
        recordId: existing?.id || null,
      };
    });
  },

  /**
   * Saves attendance records for a group on a date.
   * Guarantees zero duplicate attendance entries for the same student on the same date.
   */
  async saveGroupAttendance(
    date: string,
    groupId: string,
    entries: { studentId: string; status: AttendanceStatus; notes?: string | null }[]
  ): Promise<void> {
    const now = new Date().toISOString();

    await withDbTransaction(async () => {
      for (const entry of entries) {
        const id = generateId();
        await executeRun(
          `INSERT INTO attendance_records (
            id, date, student_id, group_id, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(student_id, date) DO UPDATE SET
            group_id = excluded.group_id,
            status = excluded.status,
            notes = excluded.notes,
            updated_at = excluded.updated_at;`,
          [
            id,
            date,
            entry.studentId,
            groupId,
            entry.status,
            entry.notes?.trim() || null,
            now,
            now,
          ]
        );
      }
    });
  },

  /**
   * Retrieves attendance history for a single student.
   */
  async getStudentAttendanceHistory(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceRecord[]> {
    const conditions: string[] = ['ar.student_id = ?'];
    const params: any[] = [studentId];

    if (startDate) {
      conditions.push('ar.date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('ar.date <= ?');
      params.push(endDate);
    }

    const sql = `
      SELECT ar.*, s.full_name AS student_name, g.name AS group_name
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      JOIN groups g ON ar.group_id = g.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ar.date DESC;
    `;

    const rows = await queryAll<
      AttendanceRecordRow & { student_name: string; group_name: string }
    >(sql, params);

    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      studentId: r.student_id,
      studentName: r.student_name,
      groupId: r.group_id,
      groupName: r.group_name,
      status: r.status as AttendanceStatus,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * Calculates attendance summary metrics for a student in a date range.
   */
  async getStudentAttendanceSummary(
    studentId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceSummary> {
    const sql = `
      SELECT status, COUNT(*) as count
      FROM attendance_records
      WHERE student_id = ? AND date >= ? AND date <= ?
      GROUP BY status;
    `;
    const rows = await queryAll<{ status: string; count: number }>(sql, [
      studentId,
      startDate,
      endDate,
    ]);

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    rows.forEach((r) => {
      if (r.status === 'present') present = r.count;
      if (r.status === 'absent') absent = r.count;
      if (r.status === 'late') late = r.count;
      if (r.status === 'excused') excused = r.count;
    });

    const totalDays = present + absent + late + excused;
    const percentage = totalDays > 0 ? Math.round(((present + late * 0.5) / totalDays) * 100) : 0;

    return {
      totalDays,
      present,
      absent,
      late,
      excused,
      percentage,
    };
  },

  /**
   * Calculates attendance summary metrics for an entire group in a date range.
   */
  async getGroupAttendanceSummary(
    groupId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceSummary> {
    const sql = `
      SELECT status, COUNT(*) as count
      FROM attendance_records
      WHERE group_id = ? AND date >= ? AND date <= ?
      GROUP BY status;
    `;
    const rows = await queryAll<{ status: string; count: number }>(sql, [
      groupId,
      startDate,
      endDate,
    ]);

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    rows.forEach((r) => {
      if (r.status === 'present') present = r.count;
      if (r.status === 'absent') absent = r.count;
      if (r.status === 'late') late = r.count;
      if (r.status === 'excused') excused = r.count;
    });

    const totalDays = present + absent + late + excused;
    const percentage = totalDays > 0 ? Math.round(((present + late * 0.5) / totalDays) * 100) : 0;

    return {
      totalDays,
      present,
      absent,
      late,
      excused,
      percentage,
    };
  },
};
