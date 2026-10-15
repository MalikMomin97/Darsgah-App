import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../config/theme';
import { queryFirst, queryAll } from '../../db/database';
import { getTodayDateString, formatDateDisplay, shiftDateString } from '../../utils/dateUtils';
import { SettingsService } from '../../services/settingsService';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation } from '../../navigation/appNavigation';


interface GroupStatusItem {
  id: string;
  name: string;
  studentCount: number;
  attendanceMarked: boolean;
}

const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const DashboardScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [institutionName, setInstitutionName] = useState('Darsgah');
  const [academicSession, setAcademicSession] = useState('2026-2027');
  const [groupsStatus, setGroupsStatus] = useState<GroupStatusItem[]>([]);
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalGroups: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    todayExcused: 0,
    needingRevision: 0,
    todaySabakRecorded: 0,
    todayChaptersCompleted: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [instName, session] = await Promise.all([
        SettingsService.getSetting('institution_name', 'Darsgah Islamic Institute'),
        SettingsService.getSetting('academic_session', '2026-2027'),
      ]);
      setInstitutionName(instName);
      setAcademicSession(session);

      const today = getTodayDateString();

      // 1. Student & Group Counts
      const studRes = await queryFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM students WHERE is_active = 1 AND is_archived = 0;'
      );

      const grpRes = await queryFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM groups WHERE is_archived = 0;'
      );

      // 2. Today's Attendance Counts
      const attRows = await queryAll<{ status: string; count: number }>(
        'SELECT status, COUNT(*) as count FROM attendance_records WHERE date = ? GROUP BY status;',
        [today]
      );

      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;

      attRows.forEach((r) => {
        if (r.status === 'present') present = r.count;
        if (r.status === 'absent') absent = r.count;
        if (r.status === 'late') late = r.count;
        if (r.status === 'excused') excused = r.count;
      });

      // 3. Today's Sabak / Progress Stats
      const todaySabakRes = await queryFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM lesson_log WHERE date = ?;',
        [today]
      );

      const todayCompletedRes = await queryFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM lesson_log WHERE date = ? AND is_completed = 1;',
        [today]
      );

      // 4. Students rated Needs Improvement / Bad in the last 7 days
      const revRes = await queryFirst<{ count: number }>(
        `SELECT COUNT(DISTINCT student_id) as count FROM lesson_log
         WHERE date >= ? AND rating IN ('needs_improvement', 'bad');`,
        [shiftDateString(today, -6)]
      );

      // 5. Active Group Status with Attendance Status
      const groupRows = await queryAll<any>(
        `SELECT g.id, g.name,
                (SELECT COUNT(*) FROM students s WHERE s.current_group_id = g.id AND s.is_active = 1 AND s.is_archived = 0) as student_count,
                (SELECT COUNT(*) FROM attendance_records a WHERE a.group_id = g.id AND a.date = ?) as attendance_marked_count
         FROM groups g
         WHERE g.is_archived = 0
         ORDER BY g.sort_order ASC, g.name ASC;`,
        [today]
      );

      const formattedGroups: GroupStatusItem[] = groupRows.map((g) => ({
        id: g.id,
        name: g.name,
        studentCount: g.student_count || 0,
        attendanceMarked: (g.attendance_marked_count || 0) > 0,
      }));

      setStats({
        activeStudents: studRes?.count || 0,
        totalGroups: grpRes?.count || 0,
        todayPresent: present,
        todayAbsent: absent,
        todayLate: late,
        todayExcused: excused,
        needingRevision: revRes?.count || 0,
        todaySabakRecorded: todaySabakRes?.count || 0,
        todayChaptersCompleted: todayCompletedRes?.count || 0,
      });

      setGroupsStatus(formattedGroups);
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const todayStr = getTodayDateString();
  const totalMarked = stats.todayPresent + stats.todayAbsent + stats.todayLate + stats.todayExcused;
  const attendanceRate = totalMarked > 0 ? Math.round(((stats.todayPresent + stats.todayLate) / totalMarked) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboardData} colors={[Colors.primary]} />}
    >
      {/* 1. HERO HEADER CARD (Premium Gradient) */}
      <LinearGradient
        colors={['#064E3B', '#0F5132', '#022C22']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { paddingTop: Spacing.xl + insets.top }]}
      >
        {/* Subtle Decorative Background Rings */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Top Utility Row */}
        <View style={styles.heroTopRow}>
          <View style={styles.arabicPill}>
            <Text style={styles.arabicPillText}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          </View>

          <TouchableOpacity
            style={styles.glassSettingsBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Institution & Greeting */}
        <View style={styles.heroMain}>
          <Text style={styles.institutionTitle}>{institutionName}</Text>
          <View style={styles.sessionBadgeRow}>
            <View style={styles.sessionBadge}>
              <Ionicons name="school-outline" size={12} color="#FDE68A" />
              <Text style={styles.sessionBadgeText}>{academicSession}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
              <Text style={styles.dateBadgeText}>{formatDateDisplay(todayStr)}</Text>
            </View>
          </View>
          <Text style={styles.heroGreeting}>
            {getTimeGreeting()}, Ustadh 👋
          </Text>
        </View>

        {/* Floating Quick Summary Strip Inside Hero */}
        <View style={styles.heroStatsStrip}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNumber}>{stats.activeStudents}</Text>
            <Text style={styles.heroStatLabel}>Students</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNumber}>{stats.totalGroups}</Text>
            <Text style={styles.heroStatLabel}>Groups</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNumber, { color: '#86EFAC' }]}>
              {stats.todayPresent}
            </Text>
            <Text style={styles.heroStatLabel}>Present</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNumber, { color: '#FDE68A' }]}>
              {stats.todaySabakRecorded}
            </Text>
            <Text style={styles.heroStatLabel}>Sabak</Text>
          </View>
        </View>
      </LinearGradient>

      {/* 2. PRIMARY ACTION CENTER (Quick Action Grid) */}
      <View style={styles.sectionHeaderWrap}>
        <Text style={styles.sectionHeading}>Daily Classroom Hub</Text>
        <Text style={styles.sectionSubheading}>Quick shortcuts for your daily teaching routine</Text>
      </View>

      <View style={styles.actionGrid}>
        {/* Action 1: Daily Attendance */}
        <TouchableOpacity
          style={[styles.actionCard, { borderColor: '#BBF7D0' }]}
          onPress={() => navigation.navigate('DailyAttendance', { date: todayStr })}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="checkbox" size={24} color="#16A34A" />
          </View>
          <Text style={styles.actionCardTitle}>Take Attendance</Text>
          <Text style={styles.actionCardSub}>Mark daily roll call</Text>
          <View style={styles.actionBadgePill}>
            <Text style={[styles.actionBadgeText, { color: '#16A34A' }]}>
              {totalMarked > 0 ? `${totalMarked} marked` : 'Pending'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action 2: Daily Sabak Tracker */}
        <TouchableOpacity
          style={[styles.actionCard, { borderColor: '#FED7AA' }]}
          onPress={() => navigation.navigate('DailyProgress', { date: todayStr })}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="book" size={24} color="#D97706" />
          </View>
          <Text style={styles.actionCardTitle}>Daily Sabak</Text>
          <Text style={styles.actionCardSub}>Track lessons & marks</Text>
          <View style={[styles.actionBadgePill, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.actionBadgeText, { color: '#D97706' }]}>
              {stats.todaySabakRecorded > 0 ? `${stats.todaySabakRecorded} recorded` : 'Start now'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action 3: Register Student */}
        <TouchableOpacity
          style={[styles.actionCard, { borderColor: '#BAE6FD' }]}
          onPress={() => navigation.navigate('StudentForm', {})}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="person-add" size={24} color="#0284C7" />
          </View>
          <Text style={styles.actionCardTitle}>New Student</Text>
          <Text style={styles.actionCardSub}>Register & assign group</Text>
          <View style={[styles.actionBadgePill, { backgroundColor: '#E0F2FE' }]}>
            <Text style={[styles.actionBadgeText, { color: '#0284C7' }]}>
              {stats.activeStudents} active
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action 4: Curriculum Management */}
        <TouchableOpacity
          style={[styles.actionCard, { borderColor: '#DDD6FE' }]}
          onPress={() => navigation.navigate('BookList')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="library" size={24} color="#7C3AED" />
          </View>
          <Text style={styles.actionCardTitle}>Curriculum</Text>
          <Text style={styles.actionCardSub}>Books & Chapters</Text>
          <View style={[styles.actionBadgePill, { backgroundColor: '#EDE9FE' }]}>
            <Text style={[styles.actionBadgeText, { color: '#7C3AED' }]}>
              Manage
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. TODAY'S ATTENDANCE STATUS CARD */}
      <Card style={styles.pulseCard}>
        <View style={styles.pulseHeader}>
          <View style={styles.pulseTitleRow}>
            <View style={[styles.pulseIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="people" size={20} color="#16A34A" />
            </View>
            <View>
              <Text style={styles.pulseTitle}>Today&apos;s Attendance Pulse</Text>
              <Text style={styles.pulseSub}>
                {totalMarked > 0
                  ? `${totalMarked} of ${stats.activeStudents} students recorded`
                  : 'Attendance not recorded yet today'}
              </Text>
            </View>
          </View>

          {totalMarked > 0 && (
            <View style={styles.ratePill}>
              <Text style={styles.ratePillText}>{attendanceRate}%</Text>
            </View>
          )}
        </View>

        {/* Segmented Distribution Bar */}
        {totalMarked > 0 ? (
          <View style={styles.progressTrack}>
            {stats.todayPresent > 0 && (
              <View
                style={[
                  styles.progressSegment,
                  { flex: stats.todayPresent, backgroundColor: Colors.present },
                ]}
              />
            )}
            {stats.todayLate > 0 && (
              <View
                style={[
                  styles.progressSegment,
                  { flex: stats.todayLate, backgroundColor: Colors.late },
                ]}
              />
            )}
            {stats.todayAbsent > 0 && (
              <View
                style={[
                  styles.progressSegment,
                  { flex: stats.todayAbsent, backgroundColor: Colors.absent },
                ]}
              />
            )}
            {stats.todayExcused > 0 && (
              <View
                style={[
                  styles.progressSegment,
                  { flex: stats.todayExcused, backgroundColor: Colors.excused },
                ]}
              />
            )}
          </View>
        ) : (
          <View style={[styles.progressTrack, { backgroundColor: Colors.surfaceSubtle }]}>
            <View style={{ flex: 1, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
          </View>
        )}

        {/* Metrics Row */}
        <View style={styles.pulseStatsRow}>
          <View style={[styles.pulsePillBox, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.pulseNum, { color: Colors.present }]}>{stats.todayPresent}</Text>
            <Text style={styles.pulseLbl}>Present</Text>
          </View>
          <View style={[styles.pulsePillBox, { backgroundColor: '#FFFBEB' }]}>
            <Text style={[styles.pulseNum, { color: Colors.late }]}>{stats.todayLate}</Text>
            <Text style={styles.pulseLbl}>Late</Text>
          </View>
          <View style={[styles.pulsePillBox, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.pulseNum, { color: Colors.absent }]}>{stats.todayAbsent}</Text>
            <Text style={styles.pulseLbl}>Absent</Text>
          </View>
          <View style={[styles.pulsePillBox, { backgroundColor: '#EEF2FF' }]}>
            <Text style={[styles.pulseNum, { color: Colors.excused }]}>{stats.todayExcused}</Text>
            <Text style={styles.pulseLbl}>Excused</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.openSheetBtn}
          onPress={() => navigation.navigate('DailyAttendance', { date: todayStr })}
          activeOpacity={0.8}
        >
          <Text style={styles.openSheetBtnText}>Open Daily Attendance Register</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* 4. TODAY'S SABAK PROGRESS HIGHLIGHT */}
      <Card style={styles.pulseCard}>
        <View style={styles.pulseHeader}>
          <View style={styles.pulseTitleRow}>
            <View style={[styles.pulseIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="sparkles" size={20} color="#D97706" />
            </View>
            <View>
              <Text style={styles.pulseTitle}>Daily Sabak & Lesson Progress</Text>
              <Text style={styles.pulseSub}>
                {stats.todaySabakRecorded > 0
                  ? `${stats.todaySabakRecorded} lessons assessed today`
                  : 'No sabak recorded today yet'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.openSabakBtn}
            onPress={() => navigation.navigate('DailyProgress', { date: todayStr })}
            activeOpacity={0.8}
          >
            <Text style={styles.openSabakBtnText}>Record</Text>
            <Ionicons name="arrow-forward" size={14} color="#D97706" />
          </TouchableOpacity>
        </View>

        <View style={styles.sabakMetricRow}>
          <View style={styles.sabakMetricCard}>
            <Ionicons name="book-outline" size={18} color={Colors.primary} />
            <Text style={styles.sabakMetricVal}>{stats.todaySabakRecorded}</Text>
            <Text style={styles.sabakMetricLbl}>Lessons Rated Today</Text>
          </View>

          <View style={styles.sabakMetricCard}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#16A34A" />
            <Text style={[styles.sabakMetricVal, { color: '#16A34A' }]}>
              {stats.todayChaptersCompleted}
            </Text>
            <Text style={styles.sabakMetricLbl}>Chapters Finished</Text>
          </View>

          <View style={styles.sabakMetricCard}>
            <Ionicons name="flag-outline" size={18} color="#DC2626" />
            <Text style={[styles.sabakMetricVal, { color: '#DC2626' }]}>
              {stats.needingRevision}
            </Text>
            <Text style={styles.sabakMetricLbl}>Need Improvement</Text>
          </View>
        </View>
      </Card>

      {/* 5. CLASS GROUPS QUICK CAROUSEL */}
      {groupsStatus.length > 0 && (
        <View style={styles.groupsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Student Groups ({groupsStatus.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('GroupList')}>
              <Text style={styles.seeAllText}>View All Groups ➔</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupsCarousel}
          >
            {groupsStatus.map((grp) => (
              <TouchableOpacity
                key={grp.id}
                style={styles.groupCarouselCard}
                onPress={() => navigation.navigate('GroupDetail', { groupId: grp.id })}
                activeOpacity={0.8}
              >
                <View style={styles.groupCardHeader}>
                  <Text style={styles.groupCardName} numberOfLines={1}>
                    {grp.name}
                  </Text>
                  {grp.attendanceMarked ? (
                    <View style={styles.groupAttendanceDone}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                      <Text style={styles.groupAttendanceDoneText}>Done</Text>
                    </View>
                  ) : (
                    <View style={styles.groupAttendancePending}>
                      <Text style={styles.groupAttendancePendingText}>Pending</Text>
                    </View>
                  )}
                </View>

                <View style={styles.groupCardFooter}>
                  <View style={styles.studentCountWrap}>
                    <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.studentCountText}>{grp.studentCount} Students</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 6. REVISION REQUIRED ALERT (Only if any) */}
      {stats.needingRevision > 0 && (
        <Card style={styles.revisionWarningCard}>
          <View style={styles.revisionRow}>
            <View style={styles.revisionIconWrap}>
              <Ionicons name="alert-circle" size={24} color="#D97706" />
            </View>
            <View style={styles.revisionTextWrap}>
              <Text style={styles.revisionTitle}>
                {stats.needingRevision} Student{stats.needingRevision > 1 ? 's' : ''} Need Improvement
              </Text>
              <Text style={styles.revisionSubtitle}>
                Rated Needs Improvement or Bad in the last 7 days.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => navigation.navigate('DailyProgress', { date: todayStr })}
            >
              <Text style={styles.reviewBtnText}>Review</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },

  // Hero Card Styles
  heroCard: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.lg,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  arabicPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  arabicPillText: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  glassSettingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroMain: {
    marginBottom: Spacing.lg,
  },
  institutionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sessionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253, 230, 138, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sessionBadgeText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  dateBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  heroGreeting: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 2,
  },
  heroStatsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Section Headers
  sectionHeaderWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    ...Typography.titleSmall,
    color: Colors.text,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionSubheading: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },

  // Action Center Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionCard: {
    width: '47.5%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    ...Shadows.sm,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionCardTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.text,
  },
  actionCardSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Pulse Cards
  pulseCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
  },
  pulseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pulseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  pulseIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseTitle: {
    ...Typography.titleSmall,
    color: Colors.text,
    fontWeight: '700',
  },
  pulseSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  ratePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  ratePillText: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressSegment: {
    height: '100%',
  },
  pulseStatsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  pulsePillBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  pulseNum: {
    ...Typography.titleSmall,
    fontWeight: '800',
  },
  pulseLbl: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  openSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  openSheetBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  // Sabak Highlight Card
  openSabakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  openSabakBtnText: {
    ...Typography.caption,
    color: '#D97706',
    fontWeight: '700',
  },
  sabakMetricRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sabakMetricCard: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  sabakMetricVal: {
    ...Typography.titleSmall,
    fontWeight: '800',
    color: Colors.text,
    marginVertical: 4,
  },
  sabakMetricLbl: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },

  // Groups Carousel
  groupsSection: {
    marginTop: Spacing.xs,
  },
  groupsCarousel: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  groupCarouselCard: {
    width: 170,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  groupCardHeader: {
    marginBottom: Spacing.sm,
  },
  groupCardName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  groupAttendanceDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  groupAttendanceDoneText: {
    ...Typography.caption,
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 11,
  },
  groupAttendancePending: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  groupAttendancePendingText: {
    ...Typography.caption,
    color: '#D97706',
    fontWeight: '700',
    fontSize: 10,
  },
  groupCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xs,
  },
  studentCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentCountText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Revision Warning Card
  revisionWarningCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1.5,
  },
  revisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  revisionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revisionTextWrap: {
    flex: 1,
  },
  revisionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.text,
  },
  revisionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reviewBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  reviewBtnText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: '700',
  },

});
