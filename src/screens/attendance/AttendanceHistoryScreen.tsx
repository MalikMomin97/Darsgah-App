import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Chip } from '../../components/common/Chip';
import { SectionHeader } from '../../components/common/SectionHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { FadeInView } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Gradients,
  Shadows,
} from '../../config/theme';
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

const RING_SIZE = 104;
const RING_WIDTH = 9;

/** Circular progress ring drawn with plain Views (two clipped, rotated half-rings). */
const ProgressRing: React.FC<{
  percent: number;
  size: number;
  width: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}> = ({ percent, size, width, color, trackColor, children }) => {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const rightDeg = -135 + (Math.min(p, 50) / 50) * 180;
  const leftDeg = 45 + (Math.max(p - 50, 0) / 50) * 180;
  const half = size / 2;
  const arc = {
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: width,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    position: 'absolute' as const,
    top: 0,
  };

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: width,
          borderColor: trackColor,
        }}
      />
      {p > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: half,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View style={[arc, { left: -half, transform: [{ rotate: `${rightDeg}deg` }] }]} />
        </View>
      ) : null}
      {p > 50 ? (
        <View
          style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}
        >
          <View style={[arc, { left: 0, transform: [{ rotate: `${leftDeg}deg` }] }]} />
        </View>
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>{children}</View>
    </View>
  );
};

function dateParts(dateStr: string): { day: string; weekday: string } {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (isNaN(dt.getTime())) return { day: '', weekday: '' };
  return {
    day: String(dt.getDate()),
    weekday: dt.toLocaleDateString(undefined, { weekday: 'short' }),
  };
}

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

  const renderAttendanceItem = ({ item, index }: { item: AttendanceRecord; index: number }) => {
    const isPresent = item.status === 'present';
    const { day, weekday } = dateParts(item.date);
    return (
      <FadeInView index={index}>
        <Card style={styles.recordCard} padding="md">
          <View style={styles.recordRow}>
            <View
              style={[
                styles.dayTile,
                { backgroundColor: isPresent ? Colors.presentBg : Colors.absentBg },
              ]}
            >
              <Text
                style={[styles.dayTileNum, { color: isPresent ? Colors.present : Colors.absent }]}
              >
                {day}
              </Text>
              <Text style={styles.dayTileWeek}>{weekday}</Text>
            </View>

            <View style={styles.dateCol}>
              <Text style={styles.dateText}>{formatDateDisplay(item.date)}</Text>
              <View style={styles.groupRow}>
                <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.groupText}>{item.groupName || 'Darsgah Tracker'}</Text>
              </View>
            </View>

            <Badge type={item.status} />
          </View>
          {item.notes ? (
            <View style={styles.notesRow}>
              <Ionicons name="document-text-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.notesText}>Note: {item.notes}</Text>
            </View>
          ) : null}
        </Card>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Attendance History"
        subtitle={student ? `${student.fullName} (${student.groupName || 'No Group'})` : ''}
        onBack={() => navigation.goBack()}
      />

      {/* Month Selector Chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScroll}
        >
          {monthOptions.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={selectedMonthYear === opt.value}
              onPress={() => {
                if (opt.value === selectedMonthYear) return;
                setLoading(true);
                setSelectedMonthYear(opt.value);
              }}
            />
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
            {/* Monthly Summary Hero */}
            <FadeInView style={styles.heroShadow}>
              <LinearGradient
                colors={Gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroTop}>
                  <View style={styles.heroTitleCol}>
                    <Text style={styles.heroOverline}>Monthly Summary</Text>
                    <Text style={styles.monthTitle}>
                      {formatMonthYearDisplay(selectedMonthYear)}
                    </Text>
                    <View style={styles.daysPill}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.accentLight} />
                      <Text style={styles.monthSub}>{summary.totalDays} Total Recorded Days</Text>
                    </View>
                  </View>

                  <ProgressRing
                    percent={summary.percentage}
                    size={RING_SIZE}
                    width={RING_WIDTH}
                    color={Colors.accent}
                    trackColor={Colors.primaryMuted}
                  >
                    <Text style={styles.percentageText}>{summary.percentage}%</Text>
                    <Text style={styles.percentageLabel}>Attendance</Text>
                  </ProgressRing>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <View style={styles.metricHead}>
                      <View style={[styles.metricDot, { backgroundColor: Colors.present }]} />
                      <Text style={styles.metricLbl}>Present</Text>
                    </View>
                    <Text style={styles.metricVal}>{summary.present}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.metricItem}>
                    <View style={styles.metricHead}>
                      <View style={[styles.metricDot, { backgroundColor: Colors.absent }]} />
                      <Text style={styles.metricLbl}>Absent</Text>
                    </View>
                    <Text style={styles.metricVal}>{summary.absent}</Text>
                  </View>
                </View>
              </LinearGradient>
            </FadeInView>

            <SectionHeader
              title="Daily History"
              meta={records.length > 0 ? `${records.length} days` : undefined}
              style={styles.sectionHeader}
            />
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
  monthScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  headerBlock: {
    marginBottom: Spacing.xs,
  },

  // Hero
  heroShadow: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xxl,
    ...Shadows.md,
  },
  hero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroTitleCol: {
    flex: 1,
  },
  heroOverline: {
    ...Typography.overline,
    color: Colors.accentLight,
    marginBottom: Spacing.xs,
  },
  monthTitle: {
    ...Typography.titleLarge,
    color: Colors.textInverse,
  },
  daysPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: Spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDeep,
  },
  monthSub: {
    ...Typography.caption,
    fontFamily: Fonts.semibold,
    color: Colors.primaryLight,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontFamily: Fonts.extrabold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.6,
    color: Colors.textInverse,
  },
  percentageLabel: {
    ...Typography.caption,
    fontSize: 9.5,
    lineHeight: 12,
    color: Colors.accentLight,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryDeep,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metricVal: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: Colors.textInverse,
    marginTop: 2,
  },
  metricLbl: {
    ...Typography.caption,
    color: Colors.primaryLight,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.primaryMuted,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },

  // Daily rows
  recordCard: {},
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dayTile: {
    width: 48,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTileNum: {
    fontFamily: Fonts.extrabold,
    fontSize: 18,
    lineHeight: 22,
  },
  dayTileWeek: {
    ...Typography.caption,
    fontSize: 10,
    lineHeight: 13,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  dateCol: {
    flex: 1,
  },
  dateText: {
    ...Typography.titleSmall,
    fontSize: 15,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  groupText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  notesText: {
    ...Typography.bodySmall,
    fontStyle: 'italic',
    flex: 1,
  },
});
