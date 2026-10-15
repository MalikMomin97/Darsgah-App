import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { IconCircle } from '../../components/common/IconCircle';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FadeInView, PressableScale, haptic } from '../../components/common/Motion';
import { PickerModal } from '../../components/learning/PickerModal';
import { ChapterRatingModal } from '../../components/learning/ChapterRatingModal';
import { RatingBadge } from '../../components/learning/RatingChips';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Shadows,
  arabicAware,
  isArabicText,
} from '../../config/theme';
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
    const arabic = isArabicText(c.title);
    const statusColor =
      c.status === 'completed'
        ? Colors.success
        : c.status === 'in_progress'
          ? Colors.info
          : Colors.textMuted;
    return (
      <FadeInView key={c.id} index={index}>
        <PressableScale
          style={[styles.chapterRow, index > 0 && styles.chapterRowBorder]}
          pressedScale={0.98}
          onPress={() => {
            haptic.tap();
            openRating(p, c);
          }}
        >
          {isCurrent ? <View style={styles.currentBar} /> : null}
          <View
            style={[
              styles.chapterNum,
              c.status === 'completed' && { backgroundColor: Colors.successLight },
              isCurrent && { backgroundColor: Colors.primary },
            ]}
          >
            {c.status === 'completed' && !isCurrent ? (
              <Ionicons name="checkmark" size={14} color={Colors.success} />
            ) : (
              <Text
                style={[
                  styles.chapterNumText,
                  isCurrent && { color: Colors.textInverse },
                  !isCurrent && c.status === 'in_progress' && { color: Colors.info },
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          <View style={styles.chapterBody}>
            <Text
              style={[
                styles.chapterTitle,
                isCurrent && styles.chapterTitleCurrent,
                arabicAware(c.title, 14),
                arabic && styles.rtl,
              ]}
            >
              {c.title}
            </Text>
            <View style={[styles.chapterMetaRow, arabic && styles.rowReverse]}>
              {isCurrent ? (
                <View style={styles.currentTag}>
                  <Text style={styles.currentTagText}>Current</Text>
                </View>
              ) : null}
              {c.status === 'in_progress' && !isCurrent ? (
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              ) : null}
              {c.lastDate ? (
                <Text style={styles.chapterMeta}>Last: {formatDateDisplay(c.lastDate)}</Text>
              ) : null}
            </View>
          </View>
          {c.lastRating ? <RatingBadge rating={c.lastRating} /> : null}
        </PressableScale>
      </FadeInView>
    );
  };

  const renderBook = (p: StudentBookProgress, bookIndex: number) => {
    const total = p.chapters.length;
    const allDone = total > 0 && p.completedCount === total;
    const isExpanded = expanded[p.book.id] ?? false;
    const currentIndex = p.chapters.findIndex((c) => c.id === p.currentChapterId);
    const current = currentIndex >= 0 ? p.chapters[currentIndex] : undefined;
    const pct = total > 0 ? Math.round((p.completedCount / total) * 100) : 0;
    const currentArabic = !!current && isArabicText(current.title);

    return (
      <FadeInView key={p.book.id} index={bookIndex}>
        <Card style={styles.bookCard}>
          <View style={styles.bookHeader}>
            <IconCircle
              icon={allDone ? 'trophy' : 'book'}
              size={44}
              square
              color={allDone ? Colors.accentDark : Colors.primary}
              bg={allDone ? Colors.accentLight : Colors.primaryLight}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bookTitle}>{p.book.title}</Text>
              <Text style={styles.meta}>
                {p.completedCount}/{total} chapters completed
              </Text>
            </View>
            <PressableScale
              onPress={() => {
                haptic.tap();
                handleBookMenu(p);
              }}
              style={styles.iconBtn}
              pressedScale={0.9}
              hitSlop={6}
              accessibilityLabel="Book options"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
            </PressableScale>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={[styles.pct, allDone && { color: Colors.success }]}>
                {pct}
                <Text style={styles.pctSign}>%</Text>
              </Text>
              {p.book.nextBookTitle ? (
                <View style={styles.nextChip}>
                  <Text style={styles.nextChipLabel}>Next</Text>
                  <Ionicons name="arrow-forward" size={11} color={Colors.accentDark} />
                  <Text style={styles.nextChipText} numberOfLines={1}>
                    {p.book.nextBookTitle}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct}%` },
                  allDone && { backgroundColor: Colors.success },
                ]}
              />
            </View>
          </View>

          {allDone ? (
            <View style={styles.banner}>
              <View style={styles.bannerTop}>
                <Ionicons name="sparkles" size={18} color={Colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerText}>All chapters completed!</Text>
                  <Text style={styles.bannerSub}>
                    {p.book.nextBookTitle
                      ? `Ready to move on to ${p.book.nextBookTitle}.`
                      : 'Ready to be marked as completed.'}
                  </Text>
                </View>
              </View>
              <Button
                title={
                  p.book.nextBookTitle ? `Promote to ${p.book.nextBookTitle}` : 'Complete book'
                }
                icon={p.book.nextBookTitle ? 'arrow-up-circle-outline' : 'checkmark-done'}
                size="sm"
                onPress={() => handlePromote(p)}
                fullWidth
              />
            </View>
          ) : current ? (
            <PressableScale
              style={styles.todayRow}
              pressedScale={0.98}
              onPress={() => {
                haptic.tap();
                openRating(p, current);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.todayLabel}>
                  Current chapter · {currentIndex + 1} of {total}
                </Text>
                <Text
                  style={[
                    styles.todayTitle,
                    arabicAware(current.title, 16),
                    currentArabic && styles.rtl,
                  ]}
                >
                  {current.title}
                </Text>
                {current.lastRating ? (
                  <View style={[styles.todayBadge, currentArabic && styles.selfEnd]}>
                    <RatingBadge rating={current.lastRating} />
                  </View>
                ) : null}
              </View>
              <View style={styles.rateBtn}>
                <Ionicons name="star" size={13} color={Colors.textInverse} />
                <Text style={styles.rateBtnText}>Rate</Text>
              </View>
            </PressableScale>
          ) : total === 0 ? (
            <View style={styles.noChapters}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
              <Text style={[styles.meta, { flex: 1 }]}>
                This book has no chapters yet. Add them in Curriculum.
              </Text>
            </View>
          ) : null}

          {total > 0 ? (
            <PressableScale
              style={styles.expandRow}
              pressedScale={0.98}
              onPress={() => {
                haptic.select();
                setExpanded((e) => ({ ...e, [p.book.id]: !isExpanded }));
              }}
            >
              <Ionicons
                name={isExpanded ? 'list' : 'list-outline'}
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.link}>
                {isExpanded ? 'Hide chapters' : `Show all ${total} chapters`}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.primary}
              />
            </PressableScale>
          ) : null}
          {isExpanded ? (
            <View style={styles.chapterList}>
              {p.chapters.map((c, i) => renderChapter(p, c, i))}
            </View>
          ) : null}
        </Card>
      </FadeInView>
    );
  };

  const assignableBooks = allBooks.filter((b) => !activeIds.has(b.id));

  return (
    <View style={styles.container}>
      <Header
        title="Learning"
        subtitle={student?.fullName}
        onBack={navigation.goBack}
        rightAction={{
          icon: 'add-circle',
          label: 'Assign Book',
          onPress: () => setAssignVisible(true),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {active.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No books assigned"
            description="Assign the books this student is studying, e.g. Qaida or Diniyat Part 1."
            actionTitle="Assign Book"
            onActionPress={() => setAssignVisible(true)}
          />
        ) : (
          <>
            <SectionHeader
              title="Current books"
              meta={`${active.length}`}
              style={styles.sectionHeader}
            />
            {active.map(renderBook)}
          </>
        )}

        {completed.length > 0 ? (
          <FadeInView index={active.length + 1} style={styles.completedSection}>
            <SectionHeader
              title="Completed books"
              meta={`${completed.length}`}
              style={styles.sectionHeader}
            />
            {completed.map((p) => (
              <Card key={p.book.id} padding="md" style={styles.doneCard}>
                <View style={styles.doneRow}>
                  <IconCircle
                    icon="checkmark-done"
                    size={38}
                    color={Colors.success}
                    bg={Colors.successLight}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doneTitle}>{p.book.title}</Text>
                    <Text style={styles.meta}>
                      Completed {formatDateDisplay(p.assignment.completedDate)} · {p.completedCount}
                      /{p.chapters.length} chapters
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </FadeInView>
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
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  sectionHeader: {
    marginBottom: -Spacing.xs,
  },
  bookCard: {
    gap: Spacing.lg,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bookTitle: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
  meta: {
    ...Typography.bodySmall,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBlock: {
    gap: Spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  pct: {
    fontFamily: Fonts.extrabold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: Colors.primary,
  },
  pctSign: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  nextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
  },
  nextChipLabel: {
    ...Typography.overline,
    fontSize: 9.5,
    color: Colors.accentDark,
  },
  nextChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.accentDark,
    flexShrink: 1,
  },
  barTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  banner: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentLight,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerText: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  bannerSub: {
    ...Typography.bodySmall,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  todayLabel: {
    ...Typography.overline,
    fontSize: 10,
    color: Colors.primaryMuted,
  },
  todayTitle: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  todayBadge: {
    marginTop: 6,
  },
  selfEnd: {
    alignSelf: 'flex-end',
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md + 2,
    height: 36,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  rateBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textInverse,
  },
  noChapters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.md,
    marginTop: -Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  link: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: Colors.primary,
  },
  chapterList: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
    overflow: 'hidden',
    marginTop: -Spacing.xs,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  chapterRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  currentBar: {
    position: 'absolute',
    left: 0,
    top: Spacing.sm,
    bottom: Spacing.sm,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: Colors.accent,
  },
  chapterNum: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  chapterBody: {
    flex: 1,
  },
  chapterTitle: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.medium,
  },
  chapterTitleCurrent: {
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  chapterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  currentTag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
  },
  currentTagText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.3,
    color: Colors.accentDark,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  chapterMeta: {
    ...Typography.caption,
  },
  completedSection: {
    gap: Spacing.md,
  },
  doneCard: {
    backgroundColor: Colors.surfaceRaised,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  doneTitle: {
    ...Typography.titleSmall,
  },
});
