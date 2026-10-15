import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Chip } from '../../components/common/Chip';
import { IconCircle } from '../../components/common/IconCircle';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import { Colors, Spacing, Typography, BorderRadius, Fonts, Shadows } from '../../config/theme';
import { Group, AttendanceStatus, Holiday } from '../../types';
import { GroupService } from '../../services/groupService';
import { AttendanceService, GroupAttendanceEntry } from '../../services/attendanceService';
import { getTodayDateString, formatDateDisplay } from '../../utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';
import { initialsOf } from '../../utils/avatar';

const SEGMENT_WIDTH = 46;
const SEGMENT_PAD = 3;
// JS driver: colour interpolation is not supported by the native driver
const TOGGLE_SPRING = { damping: 17, stiffness: 260, mass: 0.7, useNativeDriver: false };

/** Two-option Present / Absent segmented toggle with a springy sliding thumb. */
const PresenceToggle: React.FC<{
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
}> = ({ status, onChange }) => {
  const [progress] = useState(() => new Animated.Value(status === 'present' ? 0 : 1));

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: status === 'present' ? 0 : 1,
      ...TOGGLE_SPRING,
    });
    animation.start();
    return () => animation.stop();
  }, [status, progress]);

  const thumbStyle = {
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, SEGMENT_WIDTH] }) },
    ],
    backgroundColor: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.present, Colors.absent],
    }),
  };

  const trackStyle = {
    backgroundColor: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.presentBg, Colors.absentBg],
    }),
  };

  const select = (next: AttendanceStatus) => {
    if (next === status) return;
    haptic.select();
    onChange(next);
  };

  return (
    <Animated.View style={[styles.toggleTrack, trackStyle]}>
      <Animated.View style={[styles.toggleThumb, thumbStyle]} />
      <PressableScale
        style={styles.toggleSegment}
        pressedScale={0.9}
        onPress={() => select('present')}
        accessibilityRole="button"
        accessibilityLabel="Present"
        accessibilityState={{ selected: status === 'present' }}
      >
        <Text
          style={[
            styles.toggleText,
            { color: status === 'present' ? Colors.textInverse : Colors.present },
          ]}
        >
          P
        </Text>
      </PressableScale>
      <PressableScale
        style={styles.toggleSegment}
        pressedScale={0.9}
        onPress={() => select('absent')}
        accessibilityRole="button"
        accessibilityLabel="Absent"
        accessibilityState={{ selected: status === 'absent' }}
      >
        <Text
          style={[
            styles.toggleText,
            { color: status === 'absent' ? Colors.textInverse : Colors.absent },
          ]}
        >
          A
        </Text>
      </PressableScale>
    </Animated.View>
  );
};

export const DailyAttendanceScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const route = useAppRoute<'DailyAttendance'>();
  const initialGroupId = route.params?.groupId;
  const initialDate = route.params?.date || getTodayDateString();

  const [date, setDate] = useState(initialDate);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [entries, setEntries] = useState<GroupAttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [holiday, setHoliday] = useState<Holiday | null>(null);
  // Reason being typed while marking the darsgah off; null when the dialog is closed
  const [offReason, setOffReason] = useState<string | null>(null);
  const [holidayBusy, setHolidayBusy] = useState(false);

  // The tab stays mounted, so apply params from later navigations too (e.g. from Group Detail)
  const [appliedParams, setAppliedParams] = useState({
    groupId: initialGroupId,
    date: route.params?.date,
  });
  if (initialGroupId !== appliedParams.groupId || route.params?.date !== appliedParams.date) {
    setAppliedParams({ groupId: initialGroupId, date: route.params?.date });
    if (initialGroupId) setSelectedGroupId(initialGroupId);
    if (route.params?.date) setDate(route.params.date);
  }

  // Tracks unsaved edits without re-triggering the focus reload
  const hasUnsavedRef = useRef(false);
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Reload groups whenever the screen gains focus (groups may be added/archived elsewhere)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const data = await GroupService.getGroups(false);
          if (!active) return;
          setGroups(data);
          setSelectedGroupId((current) =>
            current && data.some((g) => g.id === current) ? current : data[0]?.id || null
          );
          if (data.length === 0) setLoading(false);
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'Failed to load groups.');
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  // Load attendance entries whenever date or selected group changes
  const loadAttendance = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const [data, off] = await Promise.all([
        AttendanceService.getAttendanceForDateAndGroup(date, selectedGroupId),
        AttendanceService.getHoliday(date),
      ]);
      setEntries(data);
      setHoliday(off);
      setHasUnsavedChanges(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }, [date, selectedGroupId]);

  // Runs on focus and on date/group change; keeps unsaved marks when merely re-focusing
  const lastLoadKey = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const key = `${date}|${selectedGroupId}`;
      if (lastLoadKey.current === key && hasUnsavedRef.current) return;
      lastLoadKey.current = key;
      loadAttendance();
    }, [date, selectedGroupId, loadAttendance])
  );

  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setEntries((prev) =>
      prev.map((e) => (e.student.id === studentId ? { ...e, status: newStatus } : e))
    );
    setHasUnsavedChanges(true);
  };

  const handleMarkAllPresent = () => {
    setEntries((prev) => prev.map((e) => ({ ...e, status: 'present' })));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!selectedGroupId) return;
    try {
      setSaving(true);
      await AttendanceService.saveGroupAttendance(
        date,
        selectedGroupId,
        entries.map((e) => ({
          studentId: e.student.id,
          status: e.status,
          notes: e.notes,
        }))
      );
      setHasUnsavedChanges(false);
      Alert.alert(
        'Attendance Saved',
        `Attendance for ${entries.length} students recorded for ${formatDateDisplay(date)}.`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const markOff = async (reason: string) => {
    setHolidayBusy(true);
    try {
      await AttendanceService.markHoliday(date, reason);
      setOffReason(null);
      await loadAttendance();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to mark the darsgah off.');
    } finally {
      setHolidayBusy(false);
    }
  };

  const handleConfirmOff = async () => {
    if (offReason === null) return;
    const reason = offReason;
    try {
      const saved = await AttendanceService.countMarksOnDate(date);
      if (saved === 0) return markOff(reason);
      Alert.alert(
        'Remove saved attendance?',
        `${saved} attendance mark(s) are already saved for ${formatDateDisplay(date)} across all groups. They will be removed so this day does not count for any student.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark Off', style: 'destructive', onPress: () => markOff(reason) },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to check saved attendance.');
    }
  };

  const handleRemoveOff = () => {
    Alert.alert(
      'Mark as working day?',
      `${formatDateDisplay(date)} will be a normal day again and attendance can be taken.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Working Day',
          onPress: async () => {
            setHolidayBusy(true);
            try {
              await AttendanceService.removeHoliday(date);
              await loadAttendance();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to update the day.');
            } finally {
              setHolidayBusy(false);
            }
          },
        },
      ]
    );
  };

  // Date changers (previous day / next day)
  const adjustDate = (days: number) => {
    const parts = date.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + days);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  };

  // Attendance metrics summary
  const presentCount = entries.filter((e) => e.status === 'present').length;
  const absentCount = entries.filter((e) => e.status === 'absent').length;

  const isToday = date === getTodayDateString();
  const weekday = (() => {
    const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString(undefined, { weekday: 'long' });
  })();

  const renderStudentItem = ({ item, index }: { item: GroupAttendanceEntry; index: number }) => {
    const isPresent = item.status === 'present';
    return (
      <FadeInView index={index}>
        <Card style={styles.studentCard} padding="md">
          <View style={styles.cardRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isPresent ? Colors.primaryLight : Colors.absentBg },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: isPresent ? Colors.primary : Colors.absent }]}
              >
                {initialsOf(item.student.fullName)}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.studentName} numberOfLines={1}>
                {item.student.fullName}
              </Text>
              {item.student.admissionNumber ? (
                <Text style={styles.admissionText}>Roll: {item.student.admissionNumber}</Text>
              ) : null}
            </View>

            {/* Quick status toggle: P, A */}
            <PresenceToggle
              status={item.status}
              onChange={(next) => handleStatusChange(item.student.id, next)}
            />
          </View>
        </Card>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Daily Attendance"
        rightAction={{
          icon: 'calendar-outline',
          label: 'Today',
          onPress: () => setDate(getTodayDateString()),
        }}
      />

      {/* Date Navigator */}
      <FadeInView style={styles.dateBar}>
        <PressableScale
          style={styles.dateArrow}
          onPress={() => adjustDate(-1)}
          pressedScale={0.88}
          hapticOnPress
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
        >
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </PressableScale>

        <View style={styles.dateTextWrap}>
          <View style={styles.weekdayRow}>
            <Text style={styles.weekdayText}>{weekday}</Text>
            {isToday ? (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>Today</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.dateMain}>{formatDateDisplay(date)}</Text>
          <Text style={styles.dateRaw}>{date}</Text>
        </View>

        <PressableScale
          style={styles.dateArrow}
          onPress={() => adjustDate(1)}
          pressedScale={0.88}
          hapticOnPress
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </PressableScale>
      </FadeInView>

      {/* Group Selector Chips */}
      <FadeInView index={1}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupsScroll}
        >
          {groups.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              icon="people-outline"
              selected={selectedGroupId === g.id}
              onPress={() => setSelectedGroupId(g.id)}
            />
          ))}
        </ScrollView>
      </FadeInView>

      {holiday ? (
        <FadeInView index={2} style={styles.offWrap}>
          <Card style={styles.offCard} padding="xxl" elevation="md">
            <View style={styles.offHalo}>
              <IconCircle icon="moon" color={Colors.holiday} bg={Colors.surface} size={60} />
            </View>
            <Text style={styles.offOverline}>No classes today</Text>
            <Text style={styles.offTitle}>Darsgah Off</Text>
            <Text style={styles.offDate}>{formatDateDisplay(date)}</Text>
            {holiday.reason ? (
              <View style={styles.offReasonPill}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.holiday} />
                <Text style={styles.offReason}>{holiday.reason}</Text>
              </View>
            ) : null}
            <Text style={styles.offInfo}>
              No attendance is taken on this day for any group, so it does not count towards any
              student&apos;s attendance.
            </Text>
            <Button
              title="Mark as Working Day"
              variant="secondary"
              icon="sunny-outline"
              onPress={handleRemoveOff}
              loading={holidayBusy}
              fullWidth
            />
          </Card>
        </FadeInView>
      ) : (
        <>
          {/* Attendance Metrics & Quick Actions */}
          <FadeInView index={2} style={styles.summaryWrap}>
            <Card style={styles.summaryCard} padding="md">
              <View style={styles.counterRow}>
                <View style={styles.counterItem}>
                  <View style={[styles.counterDot, { backgroundColor: Colors.present }]} />
                  <Text style={[styles.counterVal, { color: Colors.present }]}>{presentCount}</Text>
                  <Text style={styles.counterLbl}>Present</Text>
                </View>
                <View style={styles.counterDivider} />
                <View style={styles.counterItem}>
                  <View style={[styles.counterDot, { backgroundColor: Colors.absent }]} />
                  <Text style={[styles.counterVal, { color: Colors.absent }]}>{absentCount}</Text>
                  <Text style={styles.counterLbl}>Absent</Text>
                </View>
              </View>

              <View style={styles.summaryActions}>
                <PressableScale
                  style={[styles.pillBtn, styles.offBtn]}
                  onPress={() => setOffReason('')}
                  pressedScale={0.94}
                  hapticOnPress
                >
                  <Ionicons name="moon-outline" size={14} color={Colors.holiday} />
                  <Text style={[styles.pillBtnText, { color: Colors.holiday }]}>Darsgah Off</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.pillBtn, styles.markAllBtn]}
                  onPress={handleMarkAllPresent}
                  pressedScale={0.94}
                  hapticOnPress
                >
                  <Ionicons name="checkmark-done" size={15} color={Colors.primary} />
                  <Text style={[styles.pillBtnText, { color: Colors.primary }]}>All Present</Text>
                </PressableScale>
              </View>
            </Card>
          </FadeInView>

          {/* Student Attendance List */}
          {loading ? (
            <LoadingScreen message="Loading group attendance..." />
          ) : entries.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No Students in this Group"
              description="Assign students to this group to take daily attendance."
              actionTitle="Manage Groups"
              onActionPress={() => navigation.navigate('GroupList')}
            />
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => item.student.id}
              renderItem={renderStudentItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Sticky Save Bar */}
          {entries.length > 0 && (
            <FadeInView delay={120} rise={0} style={styles.bottomBar}>
              {hasUnsavedChanges ? (
                <View style={styles.unsavedRow}>
                  <View style={styles.unsavedDot} />
                  <Text style={styles.unsavedText}>Unsaved changes</Text>
                </View>
              ) : null}
              <Button
                title={
                  hasUnsavedChanges
                    ? 'Save Attendance Records'
                    : 'Attendance Saved (Tap to Re-save)'
                }
                variant={hasUnsavedChanges ? 'primary' : 'secondary'}
                icon="save-outline"
                onPress={handleSave}
                loading={saving}
                fullWidth
              />
            </FadeInView>
          )}
        </>
      )}

      <Modal
        visible={offReason !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOffReason(null)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FadeInView style={[styles.sheet, { paddingBottom: Spacing.xl + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <IconCircle icon="moon" color={Colors.holiday} bg={Colors.holidayBg} size={48} />
              <View style={styles.sheetHeaderText}>
                <Text style={styles.modalTitle}>Mark Darsgah Off</Text>
                <Text style={styles.modalDate}>{formatDateDisplay(date)}</Text>
              </View>
            </View>
            <Text style={styles.modalText}>
              {formatDateDisplay(date)} will be an off day for all groups. No attendance is taken
              and it won&apos;t affect any student&apos;s attendance.
            </Text>
            <Input
              label="Reason"
              value={offReason ?? ''}
              onChangeText={setOffReason}
              placeholder="Optional, e.g. Eid, Friday, rain"
              leftIcon="create-outline"
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setOffReason(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Mark Off"
                icon="moon-outline"
                onPress={handleConfirmOff}
                loading={holidayBusy}
                style={styles.modalBtn}
              />
            </View>
          </FadeInView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Date navigator
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  dateArrow: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTextWrap: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 18,
  },
  weekdayText: {
    ...Typography.overline,
    color: Colors.accent,
  },
  todayPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  todayPillText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    color: Colors.primary,
  },
  dateMain: {
    ...Typography.titleMedium,
    fontFamily: Fonts.extrabold,
    marginTop: 2,
  },
  dateRaw: {
    ...Typography.caption,
    marginTop: 1,
  },

  // Groups
  groupsScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },

  // Summary strip
  summaryWrap: {
    paddingHorizontal: Spacing.lg,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  counterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    alignSelf: 'center',
  },
  counterVal: {
    fontFamily: Fonts.extrabold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  counterLbl: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  counterDivider: {
    width: 1,
    height: 22,
    backgroundColor: Colors.border,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  pillBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
  },
  offBtn: {
    backgroundColor: Colors.holidayBg,
  },
  markAllBtn: {
    backgroundColor: Colors.primaryLight,
  },

  // Student list
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 132,
    gap: Spacing.sm,
  },
  studentCard: {},
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  infoCol: {
    flex: 1,
  },
  studentName: {
    ...Typography.titleSmall,
    fontSize: 15,
  },
  admissionText: {
    ...Typography.caption,
    marginTop: 2,
  },

  // Segmented toggle
  toggleTrack: {
    flexDirection: 'row',
    padding: SEGMENT_PAD,
    borderRadius: BorderRadius.full,
  },
  toggleThumb: {
    position: 'absolute',
    top: SEGMENT_PAD,
    bottom: SEGMENT_PAD,
    left: SEGMENT_PAD,
    width: SEGMENT_WIDTH,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  toggleSegment: {
    width: SEGMENT_WIDTH,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  toggleText: {
    fontFamily: Fonts.extrabold,
    fontSize: 14,
  },

  // Save bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderTopWidth: 1,
    borderColor: Colors.border,
    ...Shadows.lg,
  },
  unsavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  unsavedText: {
    ...Typography.caption,
    color: Colors.accentDark,
  },

  // Darsgah off state
  offWrap: {
    padding: Spacing.lg,
  },
  offCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.holidayBg,
  },
  offHalo: {
    width: 92,
    height: 92,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.holidayBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  offOverline: {
    ...Typography.overline,
    color: Colors.holiday,
    marginBottom: Spacing.xs,
  },
  offTitle: {
    ...Typography.titleLarge,
    color: Colors.text,
  },
  offDate: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  offReasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.holidayBg,
    maxWidth: '100%',
  },
  offReason: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.semibold,
    color: Colors.holiday,
    flexShrink: 1,
  },
  offInfo: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    maxWidth: 300,
  },

  // Off-day sheet
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    ...Shadows.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderDark,
    marginBottom: Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sheetHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...Typography.titleMedium,
  },
  modalDate: {
    ...Typography.bodySmall,
    fontFamily: Fonts.semibold,
    color: Colors.holiday,
    marginTop: 1,
  },
  modalText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalBtn: {
    flex: 1,
  },
});
