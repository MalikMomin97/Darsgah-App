import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { AttendanceRecord, AttendanceSummary, Student } from '../../types';
import { AttendanceService } from '../../services/attendanceService';
import { StudentService } from '../../services/studentService';
import {
  getCurrentMonthYear,
  getMonthOptions,
  getMonthDateRange,
  formatDateDisplay,
  formatMonthYearDisplay,
} from '../../utils/dateUtils';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

export const AttendanceHistoryScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'AttendanceHistory'>();
  const studentId = route.params?.studentId;

  const [student, setStudent] = useState<Student | null>(null);
  const [selectedMonthYear, setSelectedMonthYear] = useState(getCurrentMonthYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);

  const monthOptions = getMonthOptions();

  const loadData = useCallback(async () => {
    if (!studentId) return;
    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonthYear);
      const [std, attRecords, attSummary] = await Promise.all([
        StudentService.getStudentById(studentId),
        AttendanceService.getStudentAttendanceHistory(studentId, startDate, endDate),
        AttendanceService.getStudentAttendanceSummary(studentId, startDate, endDate),
      ]);

      setStudent(std);
      setRecords(attRecords);
      setSummary(attSummary);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  }, [studentId, selectedMonthYear]);

  useEffect(() => {
    (async () => await loadData())();
  }, [loadData]);

  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.recordRow}>
        <View style={styles.dateCol}>
          <Text style={styles.dateText}>{formatDateDisplay(item.date)}</Text>
          <Text style={styles.groupText}>{item.groupName || 'Darsgah'}</Text>
        </View>

        <Badge type={item.status} />
      </View>
      {item.notes ? (
        <Text style={styles.notesText}>Note: {item.notes}</Text>
      ) : null}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Attendance History"
        subtitle={student ? `${student.fullName} (${student.groupName || 'No Group'})` : ''}
        onBack={() => navigation.goBack()}
      />

      {/* Month Selector Carousel */}
      <View style={styles.monthBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScroll}
        >
          {monthOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.monthChip,
                selectedMonthYear === opt.value && styles.monthChipActive,
              ]}
              onPress={() => {
                if (opt.value === selectedMonthYear) return;
                setLoading(true);
                setSelectedMonthYear(opt.value);
              }}
            >
              <Text
                style={[
                  styles.monthChipText,
                  selectedMonthYear === opt.value && styles.monthChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendanceItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          loadData();
        }}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Monthly Summary Metric Card */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.monthTitle}>
                    {formatMonthYearDisplay(selectedMonthYear)}
                  </Text>
                  <Text style={styles.monthSub}>
                    {summary.totalDays} Total Recorded Days
                  </Text>
                </View>

                <View style={styles.percentageCircle}>
                  <Text style={styles.percentageText}>{summary.percentage}%</Text>
                  <Text style={styles.percentageLabel}>Attendance</Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: Colors.present }]}>
                    {summary.present}
                  </Text>
                  <Text style={styles.metricLbl}>Present</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: Colors.absent }]}>
                    {summary.absent}
                  </Text>
                  <Text style={styles.metricLbl}>Absent</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: Colors.late }]}>
                    {summary.late}
                  </Text>
                  <Text style={styles.metricLbl}>Late</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: Colors.excused }]}>
                    {summary.excused}
                  </Text>
                  <Text style={styles.metricLbl}>Excused</Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionHeaderTitle}>Daily History</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No Records Found"
            description={`No attendance records logged for ${formatMonthYearDisplay(selectedMonthYear)}.`}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  monthBar: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  monthChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  monthChipTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  headerBlock: {
    marginBottom: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthTitle: {
    ...Typography.titleMedium,
    color: Colors.text,
  },
  monthSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  percentageCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    ...Typography.titleSmall,
    fontWeight: '800',
    color: Colors.primary,
  },
  percentageLabel: {
    ...Typography.caption,
    fontSize: 9,
    color: Colors.primaryDark,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: Spacing.md,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    ...Typography.titleSmall,
    fontWeight: '800',
  },
  metricLbl: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  sectionHeaderTitle: {
    ...Typography.titleSmall,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  recordCard: {
    marginBottom: Spacing.xs,
    padding: Spacing.md,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateCol: {},
  dateText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text,
  },
  groupText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notesText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});
