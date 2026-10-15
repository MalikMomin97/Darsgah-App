import { AttendanceSummary, PerformanceSummary, Rating } from '../types';

/** Score each daily rating contributes to the learning percentage. */
export const RATING_SCORES: Record<Rating, number> = {
  excellent: 100,
  good: 75,
  needs_improvement: 50,
  bad: 25,
};

export type Grade = NonNullable<PerformanceSummary['grade']>;

/** Average score of all ratings in the period, or null when nothing was rated. */
export function computeLearningPercentage(counts: Record<Rating, number>): number | null {
  const ratings = Object.keys(RATING_SCORES) as Rating[];
  const total = ratings.reduce((n, r) => n + counts[r], 0);
  if (total === 0) return null;
  const score = ratings.reduce((sum, r) => sum + RATING_SCORES[r] * counts[r], 0);
  return Math.round(score / total);
}

export function gradeFor(percentage: number | null): Grade | null {
  if (percentage === null) return null;
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 75) return 'Very Good';
  if (percentage >= 60) return 'Good';
  if (percentage >= 45) return 'Needs Improvement';
  return 'Weak';
}

function learningRemark(name: string, grade: Grade | null): string {
  switch (grade) {
    case 'Excellent':
      return `MashaAllah, ${name} has shown excellent progress this month and learns lessons with confidence. Keep it up.`;
    case 'Very Good':
      return `${name} is doing very well and learns lessons consistently. A little more revision will make the results excellent.`;
    case 'Good':
      return `${name} is making good progress. Regular revision at home will help strengthen the lessons.`;
    case 'Needs Improvement':
      return `${name} needs to improve. Lessons are often not learned fully, so daily revision at home is strongly recommended.`;
    case 'Weak':
      return `${name} is finding the lessons difficult. Extra attention and daily practice at home are needed; please meet the teacher.`;
    default:
      return `No lessons were rated for ${name} this month.`;
  }
}

function attendanceRemark(attendance: AttendanceSummary): string {
  if (attendance.totalDays === 0) return '';
  if (attendance.percentage >= 90) return 'Attendance is excellent.';
  if (attendance.percentage >= 75) return 'Attendance is good, but a few days were missed.';
  return `Attendance is low (${attendance.percentage}%); regular attendance is essential for progress.`;
}

/**
 * Learning percentage, grade and parent-facing teacher's remarks for one student's month.
 */
export function describePerformance(
  studentName: string,
  ratingCounts: Record<Rating, number>,
  attendance: AttendanceSummary
): PerformanceSummary {
  const learningPercentage = computeLearningPercentage(ratingCounts);
  const grade = gradeFor(learningPercentage);
  const firstName = studentName.trim().split(/\s+/)[0] || studentName;
  const remarks = [learningRemark(firstName, grade), attendanceRemark(attendance)]
    .filter(Boolean)
    .join(' ');
  return { learningPercentage, grade, remarks };
}

const GRADE_COLORS: Record<Grade, string> = {
  Excellent: '#16A34A',
  'Very Good': '#0284C7',
  Good: '#0F5132',
  'Needs Improvement': '#D97706',
  Weak: '#DC2626',
};

/** Display color for a grade (muted grey when nothing was rated). */
export function gradeColor(grade: Grade | null): string {
  return grade ? GRADE_COLORS[grade] : '#94A3B8';
}
