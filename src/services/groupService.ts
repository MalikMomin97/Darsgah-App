import { executeRun, queryAll, queryFirst } from '../db/database';
import { Group, Student } from '../types';
import { GroupRow, StudentRow } from '../types/database';
import { generateId } from '../utils/idUtils';

export const GroupService = {
  /**
   * Retrieves all groups with current active student counts.
   */
  async getGroups(includeArchived = false): Promise<Group[]> {
    const sql = `
      SELECT g.*, 
        (SELECT COUNT(*) FROM students s WHERE s.current_group_id = g.id AND s.is_archived = 0 AND s.is_active = 1) AS student_count
      FROM groups g
      ${includeArchived ? '' : 'WHERE g.is_archived = 0'}
      ORDER BY g.sort_order ASC, g.name ASC;
    `;
    const rows = await queryAll<GroupRow & { student_count: number }>(sql);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      sortOrder: r.sort_order,
      isArchived: r.is_archived === 1,
      studentCount: r.student_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  /**
   * Retrieves a single group by ID.
   */
  async getGroupById(id: string): Promise<Group | null> {
    const sql = `
      SELECT g.*, 
        (SELECT COUNT(*) FROM students s WHERE s.current_group_id = g.id AND s.is_archived = 0 AND s.is_active = 1) AS student_count
      FROM groups g
      WHERE g.id = ?;
    `;
    const row = await queryFirst<GroupRow & { student_count: number }>(sql, [id]);
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
      isArchived: row.is_archived === 1,
      studentCount: row.student_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Creates a new group.
   */
  async createGroup(data: { name: string; description?: string; sortOrder?: number }): Promise<Group> {
    const id = generateId();
    const now = new Date().toISOString();
    const sortOrder = data.sortOrder ?? 0;

    await executeRun(
      `INSERT INTO groups (id, name, description, sort_order, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?);`,
      [id, data.name.trim(), data.description?.trim() || null, sortOrder, now, now]
    );

    return {
      id,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      sortOrder,
      isArchived: false,
      studentCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Updates an existing group.
   */
  async updateGroup(
    id: string,
    data: { name: string; description?: string; sortOrder?: number }
  ): Promise<void> {
    const now = new Date().toISOString();
    await executeRun(
      `UPDATE groups 
       SET name = ?, description = ?, sort_order = ?, updated_at = ?
       WHERE id = ?;`,
      [data.name.trim(), data.description?.trim() || null, data.sortOrder ?? 0, now, id]
    );
  },

  /**
   * Archives a group (soft delete).
   */
  async archiveGroup(id: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun(
      'UPDATE groups SET is_archived = 1, updated_at = ? WHERE id = ?;',
      [now, id]
    );
  },

  /**
   * Restores an archived group.
   */
  async unarchiveGroup(id: string): Promise<void> {
    const now = new Date().toISOString();
    await executeRun(
      'UPDATE groups SET is_archived = 0, updated_at = ? WHERE id = ?;',
      [now, id]
    );
  },

  /**
   * Gets all students assigned to a specific group.
   */
  async getStudentsInGroup(groupId: string, includeArchived = false): Promise<Student[]> {
    const sql = `
      SELECT s.*, g.name AS group_name
      FROM students s
      LEFT JOIN groups g ON s.current_group_id = g.id
      WHERE s.current_group_id = ?
      ${includeArchived ? '' : 'AND s.is_archived = 0'}
      ORDER BY s.full_name ASC;
    `;
    const rows = await queryAll<StudentRow & { group_name: string | null }>(sql, [groupId]);

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
};
