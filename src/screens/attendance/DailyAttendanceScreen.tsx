import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Group, AttendanceStatus } from '../../types';
import { GroupService } from '../../services/groupService';
import { AttendanceService, GroupAttendanceEntry } from '../../services/attendanceService';
import { getTodayDateString, formatDateDisplay } from '../../utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';


export const DailyAttendanceScreen: React.FC = () => {
  const navigation = useAppNavigation();
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

  // The tab stays mounted, so apply params from later navigations too (e.g. from Group Detail)
  const [appliedParams, setAppliedParams] = useState({ groupId: initialGroupId, date: route.params?.date });
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
      const data = await AttendanceService.getAttendanceForDateAndGroup(date, selectedGroupId);
      setEntries(data);
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
      Alert.alert('Attendance Saved', `Attendance for ${entries.length} students recorded for ${formatDateDisplay(date)}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
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
  const lateCount = entries.filter((e) => e.status === 'late').length;
  const excusedCount = entries.filter((e) => e.status === 'excused').length;

  const renderStudentItem = ({ item }: { item: GroupAttendanceEntry }) => {
    return (
      <Card style={styles.studentCard}>
        <View style={styles.cardRow}>
          <View style={styles.infoCol}>
            <Text style={styles.studentName}>{item.student.fullName}</Text>
            {item.student.admissionNumber ? (
              <Text style={styles.admissionText}>Roll: {item.student.admissionNumber}</Text>
            ) : null}
          </View>

          {/* Quick Status Buttons: P, A, L, E */}
          <View style={styles.statusButtonsGroup}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                styles.presentBtn,
                item.status === 'present' && styles.presentBtnActive,
              ]}
              onPress={() => handleStatusChange(item.student.id, 'present')}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  item.status === 'present' && styles.statusBtnTextActive,
                ]}
              >
                P
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                styles.absentBtn,
                item.status === 'absent' && styles.absentBtnActive,
              ]}
              onPress={() => handleStatusChange(item.student.id, 'absent')}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  item.status === 'absent' && styles.statusBtnTextActive,
                ]}
              >
                A
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                styles.lateBtn,
                item.status === 'late' && styles.lateBtnActive,
              ]}
              onPress={() => handleStatusChange(item.student.id, 'late')}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  item.status === 'late' && styles.statusBtnTextActive,
                ]}
              >
                L
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                styles.excusedBtn,
                item.status === 'excused' && styles.excusedBtnActive,
              ]}
              onPress={() => handleStatusChange(item.student.id, 'excused')}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  item.status === 'excused' && styles.statusBtnTextActive,
                ]}
              >
                E
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
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

      {/* Date Navigation Bar */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => adjustDate(-1)}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.dateTextWrap}>
          <Text style={styles.dateMain}>{formatDateDisplay(date)}</Text>
          <Text style={styles.dateRaw}>{date}</Text>
        </View>

        <TouchableOpacity style={styles.dateArrow} onPress={() => adjustDate(1)}>
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Group Selector Pills */}
      <View style={styles.groupsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupsScroll}
        >
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.groupPill,
                selectedGroupId === g.id && styles.groupPillActive,
              ]}
              onPress={() => setSelectedGroupId(g.id)}
            >
              <Text
                style={[
                  styles.groupPillText,
                  selectedGroupId === g.id && styles.groupPillTextActive,
                ]}
              >
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Attendance Metrics & Quick Actions Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.counterRow}>
          <View style={styles.counterItem}>
            <Text style={[styles.counterVal, { color: Colors.present }]}>{presentCount}</Text>
            <Text style={styles.counterLbl}>Present</Text>
          </View>
          <View style={styles.counterItem}>
            <Text style={[styles.counterVal, { color: Colors.absent }]}>{absentCount}</Text>
            <Text style={styles.counterLbl}>Absent</Text>
          </View>
          <View style={styles.counterItem}>
            <Text style={[styles.counterVal, { color: Colors.late }]}>{lateCount}</Text>
            <Text style={styles.counterLbl}>Late</Text>
          </View>
          <View style={styles.counterItem}>
            <Text style={[styles.counterVal, { color: Colors.excused }]}>{excusedCount}</Text>
            <Text style={styles.counterLbl}>Excused</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllPresent}>
          <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
          <Text style={styles.markAllText}>All Present</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Link to Daily Sabak / Lesson Tracker */}
      {selectedGroupId && entries.length > 0 && (
        <TouchableOpacity
          style={styles.sabakBanner}
          onPress={() =>
            navigation.navigate('DailyProgress', {
              groupId: selectedGroupId,
              date,
            })
          }
          activeOpacity={0.8}
        >
          <View style={styles.sabakBannerLeft}>
            <Ionicons name="book-outline" size={16} color={Colors.accent} />
            <Text style={styles.sabakBannerText}>Record Today&apos;s Sabak for this Group</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={Colors.accent} />
        </TouchableOpacity>
      )}

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

      {/* Bottom Save Bar */}
      {entries.length > 0 && (
        <View style={styles.bottomBar}>
          <Button
            title={hasUnsavedChanges ? 'Save Attendance Records' : 'Attendance Saved (Tap to Re-save)'}
            variant={hasUnsavedChanges ? 'primary' : 'secondary'}
            icon="save-outline"
            onPress={handleSave}
            loading={saving}
            fullWidth
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateArrow: {
    padding: Spacing.xs,
  },
  dateTextWrap: {
    alignItems: 'center',
  },
  dateMain: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text,
  },
  dateRaw: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  groupsBar: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  groupPill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  groupPillText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  groupPillTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  counterRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  counterItem: {
    alignItems: 'center',
  },
  counterVal: {
    ...Typography.bodyMedium,
    fontWeight: '800',
  },
  counterLbl: {
    ...Typography.caption,
    fontSize: 9,
    color: Colors.textSecondary,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  markAllText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primary,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 80,
    gap: Spacing.xs,
  },
  studentCard: {
    padding: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  studentName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text,
  },
  admissionText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusButtonsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  presentBtn: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  presentBtnActive: {
    backgroundColor: Colors.present,
    borderColor: Colors.present,
  },
  absentBtn: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  absentBtnActive: {
    backgroundColor: Colors.absent,
    borderColor: Colors.absent,
  },
  lateBtn: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  lateBtnActive: {
    backgroundColor: Colors.late,
    borderColor: Colors.late,
  },
  excusedBtn: {
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  excusedBtnActive: {
    backgroundColor: Colors.excused,
    borderColor: Colors.excused,
  },
  statusBtnTextActive: {
    color: Colors.textInverse,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sabakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sabakBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sabakBannerText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.accent,
  },
});
