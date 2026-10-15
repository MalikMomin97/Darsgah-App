import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
import { PickerModal } from '../../components/learning/PickerModal';
import {
  BookRowDraft,
  StudentDayCard,
  StudentDayDraft,
  buildStudentDayDraft,
} from '../../components/learning/StudentDayCard';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
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
            .map(
              (r): LessonInput => ({
                bookId: r.bookId,
                chapterId: r.chapterId!,
                rating: r.rating!,
                isCompleted: r.isCompleted,
                remarks: r.remarks,
              })
            ),
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

      <View style={styles.dateBar}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => confirmDiscard(() => setDate((d) => shiftDateString(d, -1)))}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDateDisplay(date)}</Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => confirmDiscard(() => setDate((d) => shiftDateString(d, 1)))}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {groups.length > 0 ? (
        <View style={styles.groupBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupScroll}
          >
            {groups.map((g) => {
              const active = g.id === groupId;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupChip, active && styles.groupChipActive]}
                  onPress={() => !active && confirmDiscard(() => setGroupId(g.id))}
                >
                  <Text style={[styles.groupChipText, active && styles.groupChipTextActive]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {isFuture ? <Text style={styles.futureWarning}>This date is in the future.</Text> : null}

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
            ListEmptyComponent={
              <EmptyState
                icon="person-add-outline"
                title="No active students"
                description="This group has no active students."
              />
            }
            renderItem={({ item }) => (
              <StudentDayCard
                draft={item}
                onChangeRow={changeRow}
                onPickChapter={(studentId, bookId) => setPicker({ studentId, bookId })}
                onOpenLearning={openLearning}
              />
            )}
          />
        )}

        {!loading && drafts.length > 0 ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Recorded {recordedStudents}/{drafts.length}
              {hasUnsaved ? ' · unsaved changes' : ''}
            </Text>
            <Button
              title="Save"
              icon="save-outline"
              onPress={handleSave}
              loading={saving}
              disabled={!hasUnsaved}
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
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  dateBtn: {
    padding: Spacing.sm,
  },
  dateText: {
    ...Typography.titleSmall,
  },
  groupBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  groupChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  groupChipActive: {
    backgroundColor: Colors.primary,
  },
  groupChipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  groupChipTextActive: {
    color: Colors.textInverse,
  },
  futureWarning: {
    ...Typography.bodySmall,
    color: Colors.accent,
    backgroundColor: Colors.accentLight,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
});
