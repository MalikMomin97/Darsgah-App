import { StudentMonthlyReport, GroupMonthlyReport } from '../types';
import { StudentService } from './studentService';
import { GroupService } from './groupService';
import { AttendanceService } from './attendanceService';
import { LearningService } from './learningService';
import { getMonthDateRange } from '../utils/dateUtils';
import { describePerformance } from '../utils/performance';

export const ReportService = {
  /**
   * Generates a complete monthly report for an individual student.
   */
  async generateStudentMonthlyReport(
    studentId: string,
    monthYear: string
  ): Promise<StudentMonthlyReport> {
    const { startDate, endDate } = getMonthDateRange(monthYear);

    const student = await StudentService.getStudentById(studentId);
    if (!student) throw new Error('Student not found.');

    const [attendance, learning] = await Promise.all([
      AttendanceService.getStudentAttendanceSummary(studentId, startDate, endDate),
      LearningService.getLearningSummary(studentId, startDate, endDate),
    ]);

    return {
      student,
      monthYear,
      attendance,
      learning,
      performance: describePerformance(student.fullName, learning.ratingCounts, attendance),
    };
  },

  /**
   * Generates a monthly comparative report for an entire group.
   */
  async generateGroupMonthlyReport(
    groupId: string,
    monthYear: string
  ): Promise<GroupMonthlyReport> {
    const { startDate, endDate } = getMonthDateRange(monthYear);

    const group = await GroupService.getGroupById(groupId);
    if (!group) throw new Error('Group not found.');

    const students = (await GroupService.getStudentsInGroup(groupId, false)).filter(
      (s) => s.isActive
    );

    const studentSummaries = await Promise.all(
      students.map(async (student) => {
        const [attendance, learning] = await Promise.all([
          AttendanceService.getStudentAttendanceSummary(student.id, startDate, endDate),
          LearningService.getLearningSummary(student.id, startDate, endDate),
        ]);
        const performance = describePerformance(student.fullName, learning.ratingCounts, attendance);
        return { student, attendance, learning, performance };
      })
    );

    // Average only over students who have attendance marked this month
    const withAttendance = studentSummaries.filter((s) => s.attendance.totalDays > 0);
    const averageAttendancePercentage =
      withAttendance.length > 0
        ? Math.round(
            withAttendance.reduce((sum, s) => sum + s.attendance.percentage, 0) /
              withAttendance.length
          )
        : 0;

    const rated = studentSummaries
      .map((s) => s.performance.learningPercentage)
      .filter((p): p is number => p !== null);
    const averageLearningPercentage =
      rated.length > 0 ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length) : null;

    return {
      group,
      monthYear,
      studentCount: students.length,
      averageAttendancePercentage,
      averageLearningPercentage,
      studentSummaries,
    };
  },
};
