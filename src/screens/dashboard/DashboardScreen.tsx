import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { IconCircle } from '../../components/common/IconCircle';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  Fonts,
  Gradients,
} from '../../config/theme';
import { queryFirst, queryAll } from '../../db/database';
import { getTodayDateString, formatDateDisplay, shiftDateString } from '../../utils/dateUtils';
import { SettingsService } from '../../services/settingsService';
import { AttendanceService } from '../../services/attendanceService';
import { Holiday } from '../../types';
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
    todayHoliday: null as Holiday | null,
    needingRevision: 0,
    todaySabakRecorded: 0,
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

      const present = attRows.find((r) => r.status === 'present')?.count ?? 0;
      const absent = attRows.find((r) => r.status === 'absent')?.count ?? 0;
      const todayHoliday = await AttendanceService.getHoliday(today);

      // 3. Today's Sabak count
      const todaySabakRes = await queryFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM lesson_log WHERE date = ?;',
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
        todayHoliday,
        needingRevision: revRes?.count || 0,
        todaySabakRecorded: todaySabakRes?.count || 0,
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
  const totalMarked = stats.todayPresent + stats.todayAbsent;
  const attendanceRate = totalMarked > 0 ? Math.round((stats.todayPresent / totalMarked) * 100) : 0;

  const quickActions: {
    key: string;
    title: string;
    sub: string;
    icon: React.ComponentProps<typeof IconCircle>['icon'];
    color: string;
    bg: string;
    badge: string;
    onPress: () => void;
  }[] = [
    {
      key: 'attendance',
      title: 'Take Attendance',
      sub: 'Mark daily roll call',
      icon: 'checkmark-done',
      color: Colors.success,
      bg: Colors.successLight,
      badge: totalMarked > 0 ? `${totalMarked} marked` : 'Pending',
      onPress: () => navigation.navigate('DailyAttendance', { date: todayStr }),
    },
    {
      key: 'sabak',
      title: 'Daily Sabak',
      sub: 'Track lessons & marks',
      icon: 'book',
      color: Colors.accentDark,
      bg: Colors.accentLight,
      badge: stats.todaySabakRecorded > 0 ? `${stats.todaySabakRecorded} recorded` : 'Start now',
      onPress: () => navigation.navigate('DailyProgress', { date: todayStr }),
    },
    {
      key: 'student',
      title: 'New Student',
      sub: 'Register & assign group',
      icon: 'person-add',
      color: Colors.info,
      bg: Colors.infoLight,
      badge: `${stats.activeStudents} active`,
      onPress: () => navigation.navigate('StudentForm', {}),
    },
    {
      key: 'curriculum',
      title: 'Curriculum',
      sub: 'Books & Chapters',
      icon: 'library',
      color: Colors.holiday,
      bg: Colors.holidayBg,
      badge: 'Manage',
      onPress: () => navigation.navigate('BookList'),
    },
  ];

  const heroStats = [
    { label: 'Students', value: stats.activeStudents, icon: 'people-outline' as const },
    { label: 'Groups', value: stats.totalGroups, icon: 'grid-outline' as const },
    {
      label: 'Present',
      value: stats.todayPresent,
      icon: 'checkmark-circle-outline' as const,
      tint: Colors.successLight,
    },
    {
      label: 'Sabak',
      value: stats.todaySabakRecorded,
      icon: 'book-outline' as const,
      tint: Colors.accentLight,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadDashboardData}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {/* 1. HERO HEADER */}
      <LinearGradient
        colors={Gradients.brandDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: Spacing.lg + insets.top }]}
      >
        {/* Decorative rings */}
        <View style={styles.ringLarge} />
        <View style={styles.ringSmall} />
        <View style={styles.goldGlow} />

        <FadeInView style={styles.heroTopRow}>
          <View style={styles.bismillahPill}>
            <Text style={styles.bismillahText}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          </View>

          <PressableScale
            style={styles.glassButton}
            onPress={() => navigation.navigate('Settings')}
            pressedScale={0.9}
            hapticOnPress
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textInverse} />
          </PressableScale>
        </FadeInView>

        <FadeInView index={1} style={styles.heroMain}>
          <Text style={styles.heroGreeting}>{getTimeGreeting()}, Ustadh</Text>
          <Text style={styles.institutionTitle} numberOfLines={2}>
            {institutionName}
          </Text>
          <View style={styles.heroPillsRow}>
            <View style={[styles.heroPill, styles.heroPillGold]}>
              <Ionicons name="school" size={12} color={Colors.accentLight} />
              <Text style={[styles.heroPillText, { color: Colors.accentLight }]}>
                {academicSession}
              </Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textInverse} />
              <Text style={styles.heroPillText}>{formatDateDisplay(todayStr)}</Text>
            </View>
          </View>
        </FadeInView>

        {/* Stat tiles */}
        <FadeInView index={2} style={styles.heroStatsRow}>
          {heroStats.map((s) => (
            <View key={s.label} style={styles.heroStatTile}>
              <Ionicons
                name={s.icon}
                size={15}
                color={s.tint ?? 'rgba(255, 255, 255, 0.75)'}
                style={styles.heroStatIcon}
              />
              <Text style={[styles.heroStatNumber, s.tint ? { color: s.tint } : null]}>
                {s.value}
              </Text>
              <Text style={styles.heroStatLabel}>{s.label}</Text>
            </View>
          ))}
        </FadeInView>
      </LinearGradient>

      <View style={styles.body}>
        {/* 2. QUICK ACTION GRID */}
        <FadeInView index={3} style={styles.sectionIntro}>
          <Text style={styles.sectionHeading}>Daily Classroom Hub</Text>
          <Text style={styles.sectionSubheading}>
            Quick shortcuts for your daily teaching routine
          </Text>
        </FadeInView>

        <View style={styles.actionGrid}>
          {quickActions.map((a, i) => (
            <FadeInView key={a.key} index={4 + i} style={styles.actionCell}>
              <PressableScale
                style={styles.actionCard}
                onPress={a.onPress}
                hapticOnPress
                accessibilityRole="button"
                accessibilityLabel={a.title}
              >
                <View style={styles.actionTopRow}>
                  <IconCircle icon={a.icon} color={a.color} bg={a.bg} size={44} square />
                  <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
                </View>
                <Text style={styles.actionCardTitle} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={styles.actionCardSub} numberOfLines={1}>
                  {a.sub}
                </Text>
                <View style={[styles.actionBadge, { backgroundColor: a.bg }]}>
                  <View style={[styles.actionBadgeDot, { backgroundColor: a.color }]} />
                  <Text style={[styles.actionBadgeText, { color: a.color }]} numberOfLines={1}>
                    {a.badge}
                  </Text>
                </View>
              </PressableScale>
            </FadeInView>
          ))}
        </View>

        {/* 3. TODAY'S ATTENDANCE CARD */}
        <FadeInView index={8}>
          <Card style={styles.pulseCard} padding="xl" elevation="md">
            <View style={styles.pulseHeader}>
              <IconCircle
                icon={stats.todayHoliday ? 'sunny' : 'people'}
                color={stats.todayHoliday ? Colors.holiday : Colors.primary}
                bg={stats.todayHoliday ? Colors.holidayBg : Colors.primaryLight}
                size={44}
              />
              <View style={styles.pulseTitleWrap}>
                <Text style={styles.pulseOverline}>Today</Text>
                <Text style={styles.pulseTitle}>Attendance Pulse</Text>
              </View>
              {totalMarked > 0 && (
                <View style={styles.ratePill}>
                  <Text style={styles.ratePillText}>{attendanceRate}%</Text>
                </View>
              )}
            </View>

            <Text style={[styles.pulseSub, stats.todayHoliday ? styles.pulseSubHoliday : null]}>
              {stats.todayHoliday
                ? `Darsgah off today${stats.todayHoliday.reason ? ` · ${stats.todayHoliday.reason}` : ''}`
                : totalMarked > 0
                  ? `${totalMarked} of ${stats.activeStudents} students recorded`
                  : 'Attendance not recorded yet today'}
            </Text>

            {/* Segmented distribution bar */}
            <View style={styles.progressTrack}>
              {totalMarked > 0 ? (
                <>
                  {stats.todayPresent > 0 && (
                    <View
                      style={[
                        styles.progressSegment,
                        { flex: stats.todayPresent, backgroundColor: Colors.present },
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
                </>
              ) : (
                <View style={[styles.progressSegment, styles.progressEmpty]} />
              )}
            </View>

            {/* Metrics */}
            <View style={styles.pulseStatsRow}>
              <View style={[styles.pulseMetric, { backgroundColor: Colors.presentBg }]}>
                <View style={[styles.pulseMetricDot, { backgroundColor: Colors.present }]} />
                <View>
                  <Text style={[styles.pulseNum, { color: Colors.present }]}>
                    {stats.todayPresent}
                  </Text>
                  <Text style={styles.pulseLbl}>Present</Text>
                </View>
              </View>
              <View style={[styles.pulseMetric, { backgroundColor: Colors.absentBg }]}>
                <View style={[styles.pulseMetricDot, { backgroundColor: Colors.absent }]} />
                <View>
                  <Text style={[styles.pulseNum, { color: Colors.absent }]}>
                    {stats.todayAbsent}
                  </Text>
                  <Text style={styles.pulseLbl}>Absent</Text>
                </View>
              </View>
            </View>

            <PressableScale
              style={styles.openSheetBtn}
              onPress={() => navigation.navigate('DailyAttendance', { date: todayStr })}
              hapticOnPress
              accessibilityRole="button"
            >
              <Text style={styles.openSheetBtnText}>Open Daily Attendance Register</Text>
              <View style={styles.openSheetArrow}>
                <Ionicons name="arrow-forward" size={14} color={Colors.textInverse} />
              </View>
            </PressableScale>
          </Card>
        </FadeInView>
      </View>

      {/* 4. GROUP CAROUSEL */}
      {groupsStatus.length > 0 && (
        <FadeInView index={9} style={styles.groupsSection}>
          <SectionHeader
            title="Student Groups"
            meta={`${groupsStatus.length}`}
            actionLabel="View all"
            onAction={() => {
              haptic.select();
              navigation.navigate('GroupList');
            }}
            style={styles.gutter}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupsCarousel}
            decelerationRate="fast"
            snapToInterval={GROUP_CARD_WIDTH + Spacing.md}
            snapToAlignment="start"
          >
            {groupsStatus.map((grp, i) => (
              <FadeInView key={grp.id} index={10 + i}>
                <PressableScale
                  style={styles.groupCard}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: grp.id })}
                  hapticOnPress
                  accessibilityRole="button"
                  accessibilityLabel={grp.name}
                >
                  <View style={styles.groupCardHeader}>
                    <IconCircle
                      icon="people"
                      size={38}
                      square
                      color={Colors.primary}
                      bg={Colors.primaryLight}
                    />
                    {stats.todayHoliday ? (
                      <View style={[styles.groupStatus, { backgroundColor: Colors.holidayBg }]}>
                        <Text style={[styles.groupStatusText, { color: Colors.holiday }]}>Off</Text>
                      </View>
                    ) : grp.attendanceMarked ? (
                      <View style={[styles.groupStatus, { backgroundColor: Colors.successLight }]}>
                        <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                        <Text style={[styles.groupStatusText, { color: Colors.success }]}>
                          Done
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.groupStatus, { backgroundColor: Colors.warningLight }]}>
                        <Text style={[styles.groupStatusText, { color: Colors.accentDark }]}>
                          Pending
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.groupCardName} numberOfLines={1}>
                    {grp.name}
                  </Text>

                  <View style={styles.groupCardFooter}>
                    <View style={styles.studentCountWrap}>
                      <Ionicons name="person-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.studentCountText}>{grp.studentCount} Students</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </View>
                </PressableScale>
              </FadeInView>
            ))}
          </ScrollView>
        </FadeInView>
      )}

      {/* 5. NEEDS-IMPROVEMENT ALERT */}
      {stats.needingRevision > 0 && (
        <FadeInView index={10} style={styles.gutter}>
          <View style={styles.alertCard}>
            <View style={styles.alertAccent} />
            <IconCircle icon="alert-circle" color={Colors.warning} bg={Colors.warningLight} />
            <View style={styles.alertTextWrap}>
              <Text style={styles.alertTitle}>
                {stats.needingRevision} Student{stats.needingRevision > 1 ? 's' : ''} Need
                Improvement
              </Text>
              <Text style={styles.alertSubtitle}>
                Rated Needs Improvement or Bad in the last 7 days.
              </Text>
            </View>
            <PressableScale
              style={styles.reviewBtn}
              onPress={() => navigation.navigate('DailyProgress', { date: todayStr })}
              pressedScale={0.94}
              hapticOnPress
              accessibilityRole="button"
            >
              <Text style={styles.reviewBtnText}>Review</Text>
            </PressableScale>
          </View>
        </FadeInView>
      )}
    </ScrollView>
  );
};

const GROUP_CARD_WIDTH = 176;

const glassBorder = 'rgba(255, 255, 255, 0.14)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl + Spacing.lg,
  },
  gutter: {
    paddingHorizontal: Spacing.lg,
  },
  body: {
    paddingHorizontal: Spacing.lg,
  },

  // Hero
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl + 4,
    borderBottomRightRadius: BorderRadius.xl + 4,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  ringLarge: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 28,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  ringSmall: {
    position: 'absolute',
    bottom: -50,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
  },
  goldGlow: {
    position: 'absolute',
    top: 40,
    right: 30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(212, 166, 69, 0.10)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  bismillahPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  bismillahText: {
    fontFamily: Fonts.arabic,
    fontSize: 16,
    lineHeight: 28,
    color: Colors.accentLight,
  },
  glassButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMain: {
    marginBottom: Spacing.xl,
  },
  heroGreeting: {
    ...Typography.overline,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.xs,
  },
  institutionTitle: {
    ...Typography.display,
    fontSize: 28,
    lineHeight: 35,
    color: Colors.textInverse,
  },
  heroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  heroPillGold: {
    backgroundColor: Colors.accentGlow,
    borderColor: 'rgba(212, 166, 69, 0.38)',
  },
  heroPillText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.textInverse,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroStatTile: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: glassBorder,
    alignItems: 'center',
  },
  heroStatIcon: {
    marginBottom: 6,
  },
  heroStatNumber: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: Colors.textInverse,
  },
  heroStatLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },

  // Section intro
  sectionIntro: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
  sectionSubheading: {
    ...Typography.bodySmall,
    marginTop: 2,
  },

  // Quick actions
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  actionCell: {
    width: '48.2%',
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  actionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  actionCardTitle: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  actionCardSub: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  actionBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionBadgeText: {
    fontFamily: Fonts.semibold,
    fontSize: 11.5,
  },

  // Attendance pulse
  pulseCard: {
    marginTop: Spacing.xxl,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pulseTitleWrap: {
    flex: 1,
  },
  pulseOverline: {
    ...Typography.overline,
  },
  pulseTitle: {
    ...Typography.titleMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  ratePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  ratePillText: {
    fontFamily: Fonts.extrabold,
    fontSize: 15,
    color: Colors.textInverse,
  },
  pulseSub: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  pulseSubHoliday: {
    fontFamily: Fonts.semibold,
    color: Colors.holiday,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSubtle,
    marginTop: Spacing.md,
    gap: 3,
  },
  progressSegment: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressEmpty: {
    flex: 1,
    backgroundColor: Colors.border,
  },
  pulseStatsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  pulseMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  pulseMetricDot: {
    width: 8,
    height: 28,
    borderRadius: 4,
  },
  pulseNum: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
  },
  pulseLbl: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  openSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  openSheetBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.primary,
  },
  openSheetArrow: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Groups
  groupsSection: {
    marginTop: Spacing.xxl,
  },
  groupsCarousel: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  groupCard: {
    width: GROUP_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  groupStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  groupStatusText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
  },
  groupCardName: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
  },
  groupCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  studentCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentCountText: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
  },

  // Needs-improvement alert
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 4,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.warningLight,
    ...Shadows.sm,
  },
  alertAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
    backgroundColor: Colors.warning,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  alertSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  reviewBtn: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
  },
  reviewBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.accentDark,
  },
});
