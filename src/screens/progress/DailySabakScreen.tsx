import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Chip } from '../../components/common/Chip';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import { PickerModal } from '../../components/learning/PickerModal';
import {
  BookRowDraft,
  StudentDayCard,
  StudentDayDraft,
  buildStudentDayDraft,
} from '../../components/learning/StudentDayCard';
import { Colors, Spacing, Typography, BorderRadius, Fonts, Shadows } from '../../config/theme';
import { Group } from '../../types';
import { GroupService } from '../../services/groupService';
import { LearningService, LessonInput } from '../../services/learningService';
import { formatDateDisplay, getTodayDateString, shiftDateString } from '../../utils/dateUtils';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

export const DailySabakScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const route = useAppRoute<'DailyProgress'>();

  const [date, setDate] = useState(route.params?.date || getTodayDateString());
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string | null>(route.params?.groupId || null);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [drafts, setDrafts] = useState<StudentDayDraft[]>([]);
  /** `${date}|${groupId}|${reloadToken}` of the drafts shown; loading until it matches. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ studentId: string; bookId: string } | null>(null);

  const hasUnsaved = drafts.some((d) => d.dirty);
  const isFuture = date > getTodayDateString();
  const dayKey = groupId ? `${date}|${groupId}|${reloadToken}` : null;
  const loading = !groupsLoaded || (dayKey !== null && loadedKey !== dayKey);

  const hasUnsavedRef = useRef(false);
  useEffect(() => {
    hasUnsavedRef.current = hasUnsaved;
  }, [hasUnsaved]);

  usePreventRemove(hasUnsaved, ({ data }) => {
    Alert.alert('Discard changes?', 'You have unsaved sabak entries.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Reload on focus (books may have been assigned or promoted on the Learning screen),
  // unless there are unsaved entries.
  useFocusEffect(
    useCallback(() => {
      if (hasUnsavedRef.current) return;
      let active = true;
      (async () => {
        try {
          const g = await GroupService.getGroups(false);
          if (!active) return;
          setGroups(g);
          setGroupId((current) =>
            current && g.some((x) => x.id === current) ? current : g[0]?.id || null
          );
          setReloadToken((t) => t + 1);
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'Failed to load groups.');
        } finally {
          if (active) setGroupsLoaded(true);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const loadDay = useCallback(async () => {
    if (!groupId) return;
    const key = `${date}|${groupId}|${reloadToken}`;
    try {
      const days = await LearningService.getGroupDay(date, groupId);
      setDrafts(days.map(buildStudentDayDraft));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load daily sabak.');
    } finally {
      setLoadedKey(key);
    }
  }, [date, groupId, reloadToken]);

  useEffect(() => {
    (async () => await loadDay())();
  }, [loadDay]);

  const confirmDiscard = (action: () => void) => {
    if (!hasUnsaved) {
      action();
      return;
    }
    Alert.alert('Discard changes?', 'You have unsaved sabak entries.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: action },
    ]);
  };

  const changeRow = useCallback(
    (studentId: string, bookId: string, patch: Partial<BookRowDraft>) => {
      setDrafts((prev) =>
        prev.map((d) =>
          d.day.student.id === studentId
            ? {
                ...d,
                dirty: true,
                rows: d.rows.map((r) => (r.bookId === bookId ? { ...r, ...patch } : r)),
              }
            : d
        )
      );
    },
    []
  );

  const { navigate } = navigation;
  const openLearning = useCallback(
    (studentId: string) => navigate('StudentLearning', { studentId }),
    [navigate]
  );

  const pickerData = useMemo(() => {
    if (!picker) return null;
    const student = drafts.find((d) => d.day.student.id === picker.studentId);
    const progress = student?.day.books.find((b) => b.book.id === picker.bookId);
    const row = student?.rows.find((r) => r.bookId === picker.bookId);
    if (!progress || !row) return null;
    return {
      title: progress.book.title,
      selectedId: row.chapterId,
      options: progress.chapters.map((c, i) => ({
        id: c.id,
        label: `${i + 1}. ${c.title}`,
        hint: c.id === progress.currentChapterId ? 'current' : undefined,
        done: c.status === 'completed',
      })),
    };
  }, [picker, drafts]);

  const handleSave = async () => {
    if (!groupId) return;
    const dirty = drafts.filter((d) => d.dirty);
    try {
      setSaving(true);
      await LearningService.saveGroupDay(
        date,
        groupId,
        dirty.map((d) => ({
          studentId: d.day.student.id,
          upserts: d.rows
            .filter((r) => r.rating && r.chapterId)
            .map((r): LessonInput => ({
              bookId: r.bookId,
              chapterId: r.chapterId!,
              rating: r.rating!,
              isCompleted: r.isCompleted,
              remarks: r.remarks,
            })),
          removeChapterIds: d.rows
            .filter(
              (r) => r.originalChapterId && (!r.rating || r.chapterId !== r.originalChapterId)
            )
            .map((r) => r.originalChapterId!),
        }))
      );
      setReloadToken((t) => t + 1);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save sabak.');
    } finally {
      setSaving(false);
    }
  };

  const recordedStudents = drafts.filter((d) => d.rows.some((r) => r.rating)).length;

  const isToday = date === getTodayDateString();
  const recordedPct = drafts.length > 0 ? Math.round((recordedStudents / drafts.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Header
        title="Daily Sabak"
        subtitle={formatDateDisplay(date)}
        onBack={navigation.goBack}
        rightAction={
          date !== getTodayDateString()
            ? {
                icon: 'today-outline',
                label: 'Today',
                onPress: () => confirmDiscard(() => setDate(getTodayDateString())),
              }
            : undefined
        }
      />

      <View style={styles.topArea}>
        <View style={styles.dateBar}>
          <PressableScale
            style={styles.dateBtn}
            pressedScale={0.9}
            onPress={() => {
              haptic.select();
              confirmDiscard(() => setDate((d) => shiftDateString(d, -1)));
            }}
            accessibilityLabel="Previous day"
          >
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </PressableScale>
          <View style={styles.dateCenter}>
            <Text style={[styles.dateOverline, isFuture && { color: Colors.warning }]}>
              {isToday ? 'Today' : isFuture ? 'Upcoming' : 'Past day'}
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar" size={15} color={Colors.primary} />
              <Text style={styles.dateText}>{formatDateDisplay(date)}</Text>
            </View>
          </View>
          <PressableScale
            style={styles.dateBtn}
            pressedScale={0.9}
            onPress={() => {
              haptic.select();
              confirmDiscard(() => setDate((d) => shiftDateString(d, 1)));
            }}
            accessibilityLabel="Next day"
          >
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </PressableScale>
        </View>

        {groups.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupScroll}
            style={styles.groupBar}
          >
            {groups.map((g) => {
              const active = g.id === groupId;
              return (
                <Chip
                  key={g.id}
                  label={g.name}
                  icon={active ? 'people' : 'people-outline'}
                  selected={active}
                  onPress={() => !active && confirmDiscard(() => setGroupId(g.id))}
                />
              );
            })}
          </ScrollView>
        ) : null}

        {isFuture ? (
          <View style={styles.futureWarning}>
            <Ionicons name="alert-circle" size={16} color={Colors.warning} />
            <Text style={styles.futureWarningText}>This date is in the future.</Text>
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!loading && groups.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No groups yet"
            description="Create a group and add students to start recording daily sabak."
          />
        ) : loading ? (
          <LoadingScreen message="Loading sabak..." />
        ) : (
          <FlatList
            data={drafts}
            keyExtractor={(d) => d.day.student.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="person-add-outline"
                title="No active students"
                description="This group has no active students."
              />
            }
            renderItem={({ item, index }) => (
              <FadeInView index={index}>
                <StudentDayCard
                  draft={item}
                  onChangeRow={changeRow}
                  onPickChapter={(studentId, bookId) => setPicker({ studentId, bookId })}
                  onOpenLearning={openLearning}
                />
              </FadeInView>
            )}
          />
        )}

        {!loading && drafts.length > 0 ? (
          <View style={styles.footer}>
            <View style={styles.footerInfo}>
              <View style={styles.footerTextRow}>
                <Text style={styles.footerText}>
                  Recorded{' '}
                  <Text style={styles.footerCount}>
                    {recordedStudents}/{drafts.length}
                  </Text>
                </Text>
                {hasUnsaved ? (
                  <View style={styles.unsavedPill}>
                    <View style={styles.unsavedDot} />
                    <Text style={styles.unsavedText}>unsaved changes</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.footerTrack}>
                <View style={[styles.footerFill, { width: `${recordedPct}%` }]} />
              </View>
            </View>
            <Button
              title="Save"
              icon="save-outline"
              onPress={handleSave}
              loading={saving}
              disabled={!hasUnsaved}
              style={styles.saveBtn}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {pickerData && picker ? (
        <PickerModal
          visible
          title={pickerData.title}
          options={pickerData.options}
          selectedId={pickerData.selectedId}
          onSelect={(o) => {
            changeRow(picker.studentId, picker.bookId, { chapterId: o.id });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  dateBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateOverline: {
    ...Typography.overline,
    fontSize: 10,
    color: Colors.accentDark,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dateText: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
  },
  groupBar: {
    marginHorizontal: -Spacing.lg,
    flexGrow: 0,
  },
  groupScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  futureWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.warningLight,
  },
  futureWarningText: {
    ...Typography.bodySmall,
    fontFamily: Fonts.semibold,
    color: Colors.accentDark,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    ...Shadows.lg,
  },
  footerInfo: {
    flex: 1,
    gap: Spacing.sm,
  },
  footerTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  footerText: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
  },
  footerCount: {
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  unsavedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
  },
  unsavedText: {
    fontFamily: Fonts.semibold,
    fontSize: 10.5,
    color: Colors.accentDark,
  },
  footerTrack: {
    height: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    overflow: 'hidden',
  },
  footerFill: {
    height: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success,
  },
  saveBtn: {
    minWidth: 112,
  },
});
