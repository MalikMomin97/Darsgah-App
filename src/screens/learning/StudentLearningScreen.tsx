import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { PickerModal } from '../../components/learning/PickerModal';
import { ChapterRatingModal } from '../../components/learning/ChapterRatingModal';
import { RatingBadge } from '../../components/learning/RatingChips';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Book, Student, StudentBookProgress, StudentChapter } from '../../types';
import { StudentService } from '../../services/studentService';
import { BookService } from '../../services/bookService';
import { LearningService } from '../../services/learningService';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

interface RatingTarget {
  studentId: string;
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
}

export const StudentLearningScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const { studentId } = useAppRoute<'StudentLearning'>().params;

  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<StudentBookProgress[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [assignVisible, setAssignVisible] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<RatingTarget | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p, books] = await Promise.all([
        StudentService.getStudentById(studentId),
        LearningService.getStudentBooks(studentId),
        BookService.getBooks(false),
      ]);
      setStudent(s);
      setProgress(p);
      setAllBooks(books);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load learning.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const active = progress.filter((p) => p.assignment.status === 'active');
  const completed = progress.filter((p) => p.assignment.status === 'completed');
  const activeIds = new Set(active.map((p) => p.book.id));

  const handleAssign = async (bookId: string) => {
    setAssignVisible(false);
    try {
      await LearningService.assignBook(studentId, bookId);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to assign book.');
    }
  };

  const handlePromote = (p: StudentBookProgress) => {
    const next = p.book.nextBookTitle;
    const remaining = p.chapters.length - p.completedCount;
    const message =
      (remaining > 0 ? `${remaining} chapter(s) are not completed yet.\n\n` : '') +
      (next
        ? `"${p.book.title}" will be marked completed and "${next}" will be assigned.`
        : `"${p.book.title}" will be marked completed. It has no next book set.`);
    Alert.alert(next ? `Promote to ${next}?` : 'Complete this book?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: next ? 'Promote' : 'Complete',
        onPress: async () => {
          try {
            await LearningService.promote(studentId, p.book.id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to promote.');
          }
        },
      },
    ]);
  };

  const handleBookMenu = (p: StudentBookProgress) => {
    Alert.alert(p.book.title, undefined, [
      {
        text: p.book.nextBookTitle ? `Promote to ${p.book.nextBookTitle}` : 'Mark book completed',
        onPress: () => handlePromote(p),
      },
      {
        text: 'Remove from student',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Remove book?',
            `"${p.book.title}" will be removed from ${student?.fullName}. Ratings already given stay in history.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  await LearningService.unassignBook(studentId, p.book.id);
                  await load();
                },
              },
            ]
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openRating = (p: StudentBookProgress, c: StudentChapter) =>
    setRatingTarget({
      studentId,
      bookId: p.book.id,
      bookTitle: p.book.title,
      chapterId: c.id,
      chapterTitle: c.title,
    });

  if (loading) return <LoadingScreen message="Loading learning..." />;

  const renderChapter = (p: StudentBookProgress, c: StudentChapter, index: number) => {
    const isCurrent = c.id === p.currentChapterId;
    return (
      <TouchableOpacity
        key={c.id}
        style={[styles.chapterRow, isCurrent && styles.chapterRowCurrent]}
        onPress={() => openRating(p, c)}
      >
        <Ionicons
          name={
            c.status === 'completed'
              ? 'checkmark-circle'
              : c.status === 'in_progress'
                ? 'ellipse'
                : 'ellipse-outline'
          }
          size={18}
          color={
            c.status === 'completed'
              ? Colors.success
              : c.status === 'in_progress'
                ? Colors.info
                : Colors.textMuted
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.chapterTitle}>
            {index + 1}. {c.title}
            {isCurrent ? <Text style={styles.currentTag}>  · current</Text> : null}
          </Text>
          {c.lastDate ? (
            <Text style={styles.chapterMeta}>Last: {formatDateDisplay(c.lastDate)}</Text>
          ) : null}
        </View>
        {c.lastRating ? <RatingBadge rating={c.lastRating} /> : null}
      </TouchableOpacity>
    );
  };

  const renderBook = (p: StudentBookProgress) => {
    const total = p.chapters.length;
    const allDone = total > 0 && p.completedCount === total;
    const isExpanded = expanded[p.book.id] ?? false;
    const current = p.chapters.find((c) => c.id === p.currentChapterId);
    const pct = total > 0 ? Math.round((p.completedCount / total) * 100) : 0;

    return (
      <Card key={p.book.id} style={styles.bookCard}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookTitle}>{p.book.title}</Text>
            <Text style={styles.meta}>
              {p.completedCount}/{total} chapters completed
              {p.book.nextBookTitle ? ` · next: ${p.book.nextBookTitle}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleBookMenu(p)} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>

        {allDone ? (
          <View style={styles.banner}>
            <Ionicons name="trophy-outline" size={20} color={Colors.success} />
            <Text style={styles.bannerText}>All chapters completed!</Text>
            <TouchableOpacity style={styles.bannerBtn} onPress={() => handlePromote(p)}>
              <Text style={styles.bannerBtnText}>
                {p.book.nextBookTitle ? `Promote to ${p.book.nextBookTitle}` : 'Complete book'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : current ? (
          <TouchableOpacity style={styles.todayRow} onPress={() => openRating(p, current)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayLabel}>Current chapter</Text>
              <Text style={styles.todayTitle}>{current.title}</Text>
            </View>
            {current.lastRating ? <RatingBadge rating={current.lastRating} /> : null}
            <View style={styles.rateBtn}>
              <Text style={styles.rateBtnText}>Rate</Text>
            </View>
          </TouchableOpacity>
        ) : total === 0 ? (
          <Text style={styles.meta}>This book has no chapters yet. Add them in Curriculum.</Text>
        ) : null}

        {total > 0 ? (
          <TouchableOpacity
            style={styles.expandRow}
            onPress={() => setExpanded((e) => ({ ...e, [p.book.id]: !isExpanded }))}
          >
            <Text style={styles.link}>
              {isExpanded ? 'Hide chapters' : `Show all ${total} chapters`}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.primary}
            />
          </TouchableOpacity>
        ) : null}
        {isExpanded ? p.chapters.map((c, i) => renderChapter(p, c, i)) : null}
      </Card>
    );
  };

  const assignableBooks = allBooks.filter((b) => !activeIds.has(b.id));

  return (
    <View style={styles.container}>
      <Header
        title="Learning"
        subtitle={student?.fullName}
        onBack={navigation.goBack}
        rightAction={{ icon: 'add-circle', label: 'Assign Book', onPress: () => setAssignVisible(true) }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {active.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No books assigned"
            description="Assign the books this student is studying, e.g. Qaida or Diniyat Part 1."
            actionTitle="Assign Book"
            onActionPress={() => setAssignVisible(true)}
          />
        ) : (
          active.map(renderBook)
        )}

        {completed.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Completed books</Text>
            {completed.map((p) => (
              <Card key={p.book.id} padding="md" style={styles.doneCard}>
                <View style={styles.rowBetween}>
                  <Ionicons name="checkmark-done-circle" size={22} color={Colors.success} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={styles.doneTitle}>{p.book.title}</Text>
                    <Text style={styles.meta}>
                      Completed {formatDateDisplay(p.assignment.completedDate)} ·{' '}
                      {p.completedCount}/{p.chapters.length} chapters
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {active.length > 0 ? (
          <Button
            title="Assign another book"
            variant="outline"
            icon="add"
            onPress={() => setAssignVisible(true)}
            style={{ marginTop: Spacing.sm }}
          />
        ) : null}
      </ScrollView>

      <PickerModal
        visible={assignVisible}
        title="Assign book"
        emptyText="All books are already assigned. Create more in the Curriculum tab."
        options={assignableBooks.map((b) => ({
          id: b.id,
          label: b.title,
          hint: `${b.chapterCount ?? 0} chapters${
            completed.some((c) => c.book.id === b.id) ? ' · completed before' : ''
          }`,
        }))}
        onSelect={(o) => handleAssign(o.id)}
        onClose={() => setAssignVisible(false)}
      />

      <ChapterRatingModal
        key={ratingTarget?.chapterId ?? 'none'}
        target={ratingTarget}
        onClose={() => setRatingTarget(null)}
        onSaved={() => {
          setRatingTarget(null);
          load();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookCard: {
    gap: Spacing.sm,
  },
  bookTitle: {
    ...Typography.titleSmall,
  },
  meta: {
    ...Typography.bodySmall,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  barTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: Colors.primary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.successLight,
  },
  bannerText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  bannerBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  bannerBtnText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
  },
  todayLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  todayTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.primary,
  },
  rateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  rateBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  link: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
  },
  chapterRowCurrent: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
  },
  chapterTitle: {
    ...Typography.bodyMedium,
  },
  currentTag: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  chapterMeta: {
    ...Typography.caption,
  },
  sectionLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  doneCard: {
    opacity: 0.9,
  },
  doneTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});
