import { executeRun, queryAll, queryFirst, withDbTransaction } from '../db/database';
import { Student, StudentGroupHistory } from '../types';
import { StudentRow, StudentGroupHistoryRow } from '../types/database';
import { generateId } from '../utils/idUtils';
import { getTodayDateString } from '../utils/dateUtils';

export interface StudentFilters {
  search?: string;
  groupId?: string;
  isActive?: boolean;
  includeArchived?: boolean;
}

export const StudentService = {
  /**
   * Retrieves students with flexible search and filtering.
   */
  async getStudents(filters: StudentFilters = {}): Promise<Student[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (!filters.includeArchived) {
      conditions.push('s.is_archived = 0');
    }

    if (filters.isActive !== undefined) {
      conditions.push('s.is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }

    if (filters.groupId) {
      conditions.push('s.current_group_id = ?');
      params.push(filters.groupId);
    }

    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push('(s.full_name LIKE ? OR s.admission_number LIKE ? OR s.guardian_name LIKE ?)');
      params.push(q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT s.*, g.name AS group_name
      FROM students s
      LEFT JOIN groups g ON s.current_group_id = g.id
      ${whereClause}
      ORDER BY s.full_name ASC;
    `;

    const rows = await queryAll<StudentRow & { group_name: string | null }>(sql, params);

    return rows.map((r) => ({
      id: r.id,
      admissionNumber: r.admission_number,
      fullName: r.full_name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      guardianName: r.guardian_name,
      contactPhone: r.contact_phone,
      address: r.address,
      notes: r.notes,
      currentGroupId: r.current_group_id,
      groupName: r.group_name,
      registrationDate: r.registration_date,
      isActive: r.is_active === 1,
      isArchived: r.is_archived === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * Retrieves a single student by ID with joined group information.
   */
  async getStudentById(id: string): Promise<Student | null> {
    const sql = `
      SELECT s.*, g.name AS group_name
      FROM students s
      LEFT JOIN groups g ON s.current_group_id = g.id
      WHERE s.id = ?;
    `;
    const row = await queryFirst<StudentRow & { group_name: string | null }>(sql, [id]);
    if (!row) return null;

    return {
      id: row.id,
      admissionNumber: row.admission_number,
      fullName: row.full_name,
      gender: row.gender,
      dateOfBirth: row.date_of_birth,
      guardianName: row.guardian_name,
      contactPhone: row.contact_phone,
      address: row.address,
      notes: row.notes,
      currentGroupId: row.current_group_id,
      groupName: row.group_name,
      registrationDate: row.registration_date,
      isActive: row.is_active === 1,
      isArchived: row.is_archived === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Registers a new student and initializes group history if a group is assigned.
   */
  async createStudent(data: {
    fullName: string;
    admissionNumber?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    guardianName?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    notes?: string | null;
    currentGroupId?: string | null;
    registrationDate?: string;
  }): Promise<Student> {
    const id = generateId();
    const now = new Date().toISOString();
    const regDate = data.registrationDate || getTodayDateString();

    await withDbTransaction(async () => {
      await executeRun(
        `INSERT INTO students (
          id, admission_number, full_name, gender, date_of_birth,
          guardian_name, contact_phone, address, notes,
          current_group_id, registration_date, is_active, is_archived,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?);`,
        [
          id,
          data.admissionNumber?.trim() || null,
          data.fullName.trim(),
          data.gender || null,
          data.dateOfBirth || null,
          data.guardianName?.trim() || null,
          data.contactPhone?.trim() || null,
          data.address?.trim() || null,
          data.notes?.trim() || null,
          data.currentGroupId || null,
          regDate,
          now,
          now,
        ]
      );

      // Record initial group history entry if assigned to a group
      if (data.currentGroupId) {
        const historyId = generateId();
        await executeRun(
          `INSERT INTO student_group_history (id, student_id, group_id, joined_date, left_date, notes, created_at)
           VALUES (?, ?, ?, ?, NULL, 'Initial assignment on registration', ?);`,
          [historyId, id, data.currentGroupId, regDate, now]
        );
      }
    });

    const student = await this.getStudentById(id);
    if (!student) throw new Error('Failed to retrieve created student.');
    return student;
  },

  /**
   * Updates student information and tracks group membership transitions.
   */
  async updateStudent(
    id: string,
    data: {
      fullName: string;
      admissionNumber?: string | null;
      gender?: string | null;
      dateOfBirth?: string | null;
      guardianName?: string | null;
      contactPhone?: string | null;
      address?: string | null;
      notes?: string | null;
      currentGroupId?: string | null;
      isActive?: boolean;
    }
  ): Promise<void> {
    const current = await this.getStudentById(id);
    if (!current) throw new Error('Student not found.');

    const now = new Date().toISOString();
    const today = getTodayDateString();
    const groupChanged = current.currentGroupId !== (data.currentGroupId || null);

    await withDbTransaction(async () => {
      await executeRun(
        `UPDATE students SET
          full_name = ?,
          admission_number = ?,
          gender = ?,
          date_of_birth = ?,
          guardian_name = ?,
          contact_phone = ?,
          address = ?,
          notes = ?,
          current_group_id = ?,
          is_active = ?,
          updated_at = ?
         WHERE id = ?;`,
        [
          data.fullName.trim(),
          data.admissionNumber?.trim() || null,
          data.gender || null,
          data.dateOfBirth || null,
          data.guardianName?.trim() || null,
          data.contactPhone?.trim() || null,
          data.address?.trim() || null,
          data.notes?.trim() || null,
          data.currentGroupId || null,
          data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.isActive ? 1 : 0,
          now,
          id,
        ]
      );

      // If group changed, close old history record and open new one
      if (groupChanged) {
        if (current.currentGroupId) {
          await executeRun(
            `UPDATE student_group_history 
             SET left_date = ? 
             WHERE student_id = ? AND group_id = ? AND left_date IS NULL;`,
            [today, id, current.currentGroupId]
          );
        }

        if (data.currentGroupId) {
          const histId = generateId();
          await executeRun(
            `INSERT INTO student_group_history (id, student_id, group_id, joined_date, left_date, notes, created_at)
             VALUES (?, ?, ?, ?, NULL, 'Transferred via edit', ?);`,
            [histId, id, data.currentGroupId, today, now]
          );
        }
      }
    });
  },

  /**
   * Explicitly moves a student from their current group to a new group with a reason.
   */
  async moveStudentToGroup(
    studentId: string,
    newGroupId: string | null,
    reason = 'Group transfer'
  ): Promise<void> {
    const student = await this.getStudentById(studentId);
    if (!student) throw new Error('Student not found.');

    if (student.currentGroupId === newGroupId) return;

    const now = new Date().toISOString();
    const today = getTodayDateString();

    await withDbTransaction(async () => {
      // 1. Update student
      await executeRun(
        'UPDATE students SET current_group_id = ?, updated_at = ? WHERE id = ?;',
        [newGroupId, now, studentId]
      );

      // 2. Close existing active membership
      if (student.currentGroupId) {
        await executeRun(
          `UPDATE student_group_history 
           SET left_date = ? 
           WHERE student_id = ? AND group_id = ? AND left_date IS NULL;`,
          [today, studentId, student.currentGroupId]
        );
      }

      // 3. Open new membership
      if (newGroupId) {
        const histId = generateId();
        await executeRun(
          `INSERT INTO student_group_history (id, student_id, group_id, joined_date, left_date, notes, created_at)
           VALUES (?, ?, ?, ?, NULL, ?, ?);`,
          [histId, studentId, newGroupId, today, reason, now]
        );
      }
    });
  },

  /**
   * Toggles student active / inactive status.
   */
  async setStudentActiveStatus(studentId: string, isActive: boolean): Promise<void> {
    const now = new Date().toISOString();
    await executeRun(
      'UPDATE students SET is_active = ?, updated_at = ? WHERE id = ?;',
      [isActive ? 1 : 0, now, studentId]
    );
  },

  /**
   * Soft-archives a student to protect historical learning and attendance records.
   */
  async archiveStudent(studentId: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun(
      'UPDATE students SET is_archived = 1, updated_at = ? WHERE id = ?;',
      [now, studentId]
    );
  },

  /**
   * Restores an archived student.
   */
  async unarchiveStudent(studentId: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun(
      'UPDATE students SET is_archived = 0, updated_at = ? WHERE id = ?;',
      [now, studentId]
    );
  },

  /**
   * Retrieves the historical group memberships for a student.
   */
  async getStudentGroupHistory(studentId: string): Promise<StudentGroupHistory[]> {
    const sql = `
      SELECT sgh.*, g.name AS group_name
      FROM student_group_history sgh
      LEFT JOIN groups g ON sgh.group_id = g.id
      WHERE sgh.student_id = ?
      ORDER BY sgh.joined_date DESC, sgh.created_at DESC;
    `;
    const rows = await queryAll<StudentGroupHistoryRow & { group_name: string | null }>(sql, [
      studentId,
    ]);

    return rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      groupId: r.group_id,
      groupName: r.group_name || 'Unknown Group',
      joinedDate: r.joined_date,
      leftDate: r.left_date,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  },
};
