import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  Fonts,
  arabicAware,
  isArabicText,
} from '../../config/theme';
import { Rating } from '../../types';
import { StudentLearningDay } from '../../services/learningService';
import { formatDateDisplay } from '../../utils/dateUtils';
import { Badge } from '../common/Badge';
import { IconCircle } from '../common/IconCircle';
import { PressableScale, haptic } from '../common/Motion';
import { RatingBadge, RatingChips, RATING_COLORS } from './RatingChips';
import { initialsOf } from '../../utils/avatar';

/** Editable state of one book row for one student on the selected day. */
export interface BookRowDraft {
  bookId: string;
  chapterId: string | null;
  /** Chapter of the entry already saved for this day (to remove it if cleared or changed). */
  originalChapterId: string | null;
  rating: Rating | null;
  isCompleted: boolean;
  remarks: string;
}

export interface StudentDayDraft {
  day: StudentLearningDay;
  rows: BookRowDraft[];
  dirty: boolean;
}

/** Builds the editable rows: the day's saved entry per book, else the current chapter. */
export function buildStudentDayDraft(day: StudentLearningDay): StudentDayDraft {
  return {
    day,
    dirty: false,
    rows: day.books.map((p) => {
      const entry = day.entries.find((e) => e.bookId === p.book.id);
      return {
        bookId: p.book.id,
        chapterId: entry?.chapterId ?? p.currentChapterId,
        originalChapterId: entry?.chapterId ?? null,
        rating: entry?.rating ?? null,
        isCompleted: entry?.isCompleted ?? false,
        remarks: entry?.remarks ?? '',
      };
    }),
  };
}

interface StudentDayCardProps {
  draft: StudentDayDraft;
  onChangeRow: (studentId: string, bookId: string, patch: Partial<BookRowDraft>) => void;
  onPickChapter: (studentId: string, bookId: string) => void;
  onOpenLearning: (studentId: string) => void;
}

export const StudentDayCard: React.FC<StudentDayCardProps> = ({
  draft,
  onChangeRow,
  onPickChapter,
  onOpenLearning,
}) => {
  const { student, attendance, books } = draft.day;
  const isAbsent = attendance === 'absent';
  const recorded = draft.rows.filter((r) => r.rating).length;
  const [expandedAbsent, setExpandedAbsent] = useState(false);
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  const collapsed = isAbsent && !expandedAbsent && recorded === 0;

  return (
    <View style={[styles.card, collapsed && styles.cardMuted]}>
      <View style={styles.headerRow}>
        <PressableScale
          style={styles.identity}
          pressedScale={0.98}
          onPress={() => onOpenLearning(student.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open learning for ${student.fullName}`}
        >
          <View style={[styles.avatar, isAbsent && styles.avatarAbsent]}>
            <Text style={[styles.avatarText, isAbsent && { color: Colors.absent }]}>
              {initialsOf(student.fullName)}
            </Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {student.fullName}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {student.admissionNumber ? `#${student.admissionNumber} · ` : ''}
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </Text>
          </View>
        </PressableScale>
        {attendance ? <Badge type={attendance} size="sm" /> : null}
        {recorded > 0 ? (
          <View style={styles.countBadge}>
            <Ionicons name="checkmark" size={12} color={Colors.textInverse} />
            <Text style={styles.countText}>{recorded}</Text>
          </View>
        ) : null}
      </View>

      {collapsed ? (
        <PressableScale
          style={styles.absentRow}
          pressedScale={0.98}
          onPress={() => {
            haptic.tap();
            setExpandedAbsent(true);
          }}
        >
          <Ionicons name="moon-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.absentLink}>Absent today · tap to record anyway</Text>
        </PressableScale>
      ) : books.length === 0 ? (
        <PressableScale
          style={styles.noBooks}
          pressedScale={0.98}
          onPress={() => onOpenLearning(student.id)}
        >
          <Ionicons name="add-circle" size={20} color={Colors.primary} />
          <Text style={styles.link}>No books assigned · Assign books</Text>
        </PressableScale>
      ) : (
        books.map((p) => {
          const row = draft.rows.find((r) => r.bookId === p.book.id);
          if (!row) return null;
          const chapterIndex = p.chapters.findIndex((c) => c.id === row.chapterId);
          const chapter = chapterIndex >= 0 ? p.chapters[chapterIndex] : undefined;
          const allDone = p.chapters.length > 0 && p.completedCount === p.chapters.length;
          // A book tracked as a whole (e.g. Qaida) has one chapter: nothing to choose.
          const singleChapter = p.chapters.length === 1;
          const accent = row.rating ? RATING_COLORS[row.rating].fg : Colors.border;
          const update = (patch: Partial<BookRowDraft>) =>
            onChangeRow(student.id, p.book.id, patch);
          const selectLabel = chapter
            ? chapter.title
            : allDone
              ? 'All chapters completed'
              : 'Choose chapter';
          const arabic = !!chapter && isArabicText(chapter.title);
          const notesVisible = notesOpen[p.book.id] || !!row.remarks;

          return (
            <View key={p.book.id} style={[styles.row, { borderLeftColor: accent }]}>
              <View style={styles.rowHeader}>
                <IconCircle icon="book" size={30} square />
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {p.book.title}
                </Text>
                <View style={styles.progressPill}>
                  <Text style={styles.progress}>
                    {p.completedCount}/{p.chapters.length}
                  </Text>
                </View>
                <PressableScale
                  style={[styles.noteBtn, notesVisible && styles.noteBtnActive]}
                  pressedScale={0.88}
                  onPress={() => {
                    haptic.tap();
                    setNotesOpen((n) => ({ ...n, [p.book.id]: !n[p.book.id] }));
                  }}
                  hitSlop={8}
                  accessibilityLabel="Teacher remarks"
                >
                  <Ionicons
                    name={row.remarks ? 'chatbox-ellipses' : 'chatbox-ellipses-outline'}
                    size={16}
                    color={notesVisible ? Colors.primary : Colors.textSecondary}
                  />
                </PressableScale>
              </View>

              {p.chapters.length === 0 ? (
                <Text style={styles.hint}>No chapters in this book yet.</Text>
              ) : (
                <>
                  {singleChapter ? null : (
                    <PressableScale
                      style={[styles.select, chapter && styles.selectFilled]}
                      pressedScale={0.98}
                      onPress={() => {
                        haptic.tap();
                        onPickChapter(student.id, p.book.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Choose chapter"
                    >
                      {chapter ? (
                        <View style={styles.chapterNum}>
                          <Text style={styles.chapterNumText}>{chapterIndex + 1}</Text>
                        </View>
                      ) : (
                        <Ionicons
                          name={allDone ? 'trophy-outline' : 'list-outline'}
                          size={17}
                          color={allDone ? Colors.success : Colors.textMuted}
                        />
                      )}
                      <Text
                        style={[
                          styles.selectText,
                          !chapter && styles.selectPlaceholder,
                          chapter ? arabicAware(chapter.title, 14) : null,
                          arabic && styles.rtl,
                        ]}
                        numberOfLines={1}
                      >
                        {selectLabel}
                      </Text>
                      {chapter?.lastRating && !row.rating ? (
                        <RatingBadge rating={chapter.lastRating} />
                      ) : null}
                      <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                    </PressableScale>
                  )}
                  {chapter?.lastDate ? (
                    <View style={styles.hintRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.hint}>
                        Last rated {formatDateDisplay(chapter.lastDate)}
                      </Text>
                    </View>
                  ) : null}

                  {allDone && !row.chapterId ? (
                    <PressableScale
                      style={styles.promote}
                      pressedScale={0.97}
                      hapticOnPress
                      onPress={() => onOpenLearning(student.id)}
                    >
                      <Ionicons name="ribbon-outline" size={16} color={Colors.accentDark} />
                      <Text style={styles.promoteText}>
                        {p.book.nextBookTitle
                          ? `Promote to ${p.book.nextBookTitle}`
                          : 'Complete this book'}
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color={Colors.accentDark} />
                    </PressableScale>
                  ) : (
                    <>
                      <PressableScale
                        style={styles.checkRow}
                        pressedScale={0.98}
                        onPress={() => {
                          haptic.select();
                          update({ isCompleted: !row.isCompleted });
                        }}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: row.isCompleted }}
                      >
                        <View style={[styles.checkbox, row.isCompleted && styles.checkboxOn]}>
                          {row.isCompleted ? (
                            <Ionicons name="checkmark" size={14} color={Colors.textInverse} />
                          ) : null}
                        </View>
                        <Text style={[styles.checkLabel, row.isCompleted && styles.checkLabelOn]}>
                          {singleChapter ? 'Book completed' : 'Chapter completed'}
                        </Text>
                      </PressableScale>
                      {notesVisible ? (
                        <TextInput
                          style={styles.note}
                          placeholder="Teacher remarks (optional)"
                          placeholderTextColor={Colors.textMuted}
                          selectionColor={Colors.primary}
                          cursorColor={Colors.primary}
                          value={row.remarks}
                          onChangeText={(t) => update({ remarks: t })}
                          multiline
                        />
                      ) : null}
                      <RatingChips value={row.rating} onChange={(rating) => update({ rating })} />
                    </>
                  )}
                </>
              )}
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  cardMuted: {
    backgroundColor: Colors.surfaceRaised,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAbsent: {
    backgroundColor: Colors.absentBg,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.primary,
  },
  identityText: {
    flex: 1,
  },
  name: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
  },
  meta: {
    ...Typography.caption,
    marginTop: 1,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    height: 22,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.textInverse,
  },
  absentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
  },
  absentLink: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
  },
  noBooks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryMuted,
    backgroundColor: Colors.primarySoft,
  },
  link: {
    ...Typography.bodySmall,
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
  row: {
    borderLeftWidth: 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bookTitle: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  progressPill: {
    paddingHorizontal: Spacing.sm,
    height: 22,
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  progress: {
    fontFamily: Fonts.semibold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  noteBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
  },
  noteBtnActive: {
    backgroundColor: Colors.primaryLight,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  selectFilled: {
    borderColor: Colors.primaryLight,
  },
  chapterNum: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.textInverse,
  },
  selectText: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.semibold,
    flex: 1,
  },
  selectPlaceholder: {
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
  },
  hint: {
    ...Typography.caption,
  },
  promote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentLight,
  },
  promoteText: {
    ...Typography.bodySmall,
    fontFamily: Fonts.bold,
    color: Colors.accentDark,
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkLabel: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
    color: Colors.text,
  },
  checkLabelOn: {
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
  note: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.medium,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 46,
    textAlignVertical: 'top',
  },
});
