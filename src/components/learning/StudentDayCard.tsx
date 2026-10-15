import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../config/theme';
import { Rating } from '../../types';
import { StudentLearningDay } from '../../services/learningService';
import { formatDateDisplay } from '../../utils/dateUtils';
import { RatingBadge, RatingChips, RATING_COLORS } from './RatingChips';

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
        <TouchableOpacity style={{ flex: 1 }} onPress={() => onOpenLearning(student.id)}>
          <Text style={styles.name}>{student.fullName}</Text>
          <Text style={styles.meta}>
            {student.admissionNumber ? `#${student.admissionNumber} · ` : ''}
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>
        </TouchableOpacity>
        {attendance ? (
          <View style={[styles.attBadge, isAbsent && styles.attBadgeAbsent]}>
            <Text style={[styles.attText, isAbsent && { color: Colors.absent }]}>
              {attendance.charAt(0).toUpperCase() + attendance.slice(1)}
            </Text>
          </View>
        ) : null}
        {recorded > 0 ? (
          <View style={styles.countBadge}>
            <Ionicons name="checkmark" size={12} color={Colors.textInverse} />
            <Text style={styles.countText}>{recorded}</Text>
          </View>
        ) : null}
      </View>

      {collapsed ? (
        <TouchableOpacity onPress={() => setExpandedAbsent(true)}>
          <Text style={styles.absentLink}>Absent today · tap to record anyway</Text>
        </TouchableOpacity>
      ) : books.length === 0 ? (
        <TouchableOpacity style={styles.noBooks} onPress={() => onOpenLearning(student.id)}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.link}>No books assigned · Assign books</Text>
        </TouchableOpacity>
      ) : (
        books.map((p) => {
          const row = draft.rows.find((r) => r.bookId === p.book.id);
          if (!row) return null;
          const chapter = p.chapters.find((c) => c.id === row.chapterId);
          const allDone = p.chapters.length > 0 && p.completedCount === p.chapters.length;
          const accent = row.rating ? RATING_COLORS[row.rating].fg : Colors.border;
          const update = (patch: Partial<BookRowDraft>) => onChangeRow(student.id, p.book.id, patch);

          return (
            <View key={p.book.id} style={[styles.row, { borderLeftColor: accent }]}>
              <View style={styles.rowHeader}>
                <Ionicons name="book-outline" size={16} color={Colors.primary} />
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {p.book.title}
                </Text>
                <Text style={styles.progress}>
                  {p.completedCount}/{p.chapters.length}
                </Text>
                <TouchableOpacity
                  onPress={() => setNotesOpen((n) => ({ ...n, [p.book.id]: !n[p.book.id] }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={row.remarks ? 'chatbox-ellipses' : 'chatbox-ellipses-outline'}
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {p.chapters.length === 0 ? (
                <Text style={styles.hint}>No chapters in this book yet.</Text>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.select}
                    onPress={() => onPickChapter(student.id, p.book.id)}
                  >
                    <Text style={styles.selectText} numberOfLines={1}>
                      {chapter ? chapter.title : allDone ? 'All chapters completed' : 'Choose chapter'}
                    </Text>
                    {chapter?.lastRating && !row.rating ? (
                      <RatingBadge rating={chapter.lastRating} />
                    ) : null}
                    <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {chapter?.lastDate ? (
                    <Text style={styles.hint}>Last rated {formatDateDisplay(chapter.lastDate)}</Text>
                  ) : null}

                  {allDone && !row.chapterId ? (
                    <TouchableOpacity onPress={() => onOpenLearning(student.id)}>
                      <Text style={styles.link}>
                        {p.book.nextBookTitle
                          ? `Promote to ${p.book.nextBookTitle} →`
                          : 'Complete this book →'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.checkRow}
                        onPress={() => update({ isCompleted: !row.isCompleted })}
                      >
                        <Ionicons
                          name={row.isCompleted ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={Colors.primary}
                        />
                        <Text style={styles.checkLabel}>Chapter completed</Text>
                      </TouchableOpacity>
                      {notesOpen[p.book.id] || row.remarks ? (
                        <TextInput
                          style={styles.note}
                          placeholder="Teacher remarks (optional)"
                          placeholderTextColor={Colors.textMuted}
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
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardMuted: {
    backgroundColor: Colors.surfaceSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.titleSmall,
  },
  meta: {
    ...Typography.bodySmall,
  },
  attBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.presentBg,
  },
  attBadgeAbsent: {
    backgroundColor: Colors.absentBg,
  },
  attText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.present,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  absentLink: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  noBooks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  link: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
  },
  row: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bookTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
  },
  progress: {
    ...Typography.caption,
    marginRight: Spacing.sm,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  selectText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    flex: 1,
  },
  hint: {
    ...Typography.caption,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  checkLabel: {
    ...Typography.bodySmall,
    color: Colors.text,
  },
  note: {
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    minHeight: 40,
  },
});
