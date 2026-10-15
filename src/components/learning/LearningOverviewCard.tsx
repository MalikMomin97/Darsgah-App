import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { IconCircle } from '../common/IconCircle';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  arabicAware,
  isArabicText,
} from '../../config/theme';
import { StudentBookProgress } from '../../types';
import { RatingBadge } from './RatingChips';

interface LearningOverviewCardProps {
  books: StudentBookProgress[];
  onOpen: () => void;
}

/** Compact summary of a student's books for the profile screen. */
export const LearningOverviewCard: React.FC<LearningOverviewCardProps> = ({ books, onOpen }) => {
  const active = books.filter((b) => b.assignment.status === 'active');
  const completed = books.filter((b) => b.assignment.status === 'completed');

  return (
    <Card style={styles.card} onPress={onOpen}>
      <View style={styles.titleRow}>
        <IconCircle icon="book" size={36} square />
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Learning</Text>
          <Text style={styles.subtitle}>
            {active.length} active {active.length === 1 ? 'book' : 'books'}
          </Text>
        </View>
        <View style={styles.linkPill}>
          <Text style={styles.link}>Open</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </View>

      {active.length === 0 ? (
        <Text style={styles.hint}>No books assigned yet. Tap to assign books.</Text>
      ) : (
        active.map((p) => {
          const total = p.chapters.length;
          const current = p.chapters.find((c) => c.id === p.currentChapterId);
          const pct = total > 0 ? Math.round((p.completedCount / total) * 100) : 0;
          return (
            <View key={p.book.id} style={styles.book}>
              <View style={styles.rowBetween}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {p.book.title}
                </Text>
                <Text style={styles.count}>
                  {p.completedCount}
                  <Text style={styles.countTotal}>/{total}</Text>
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              {current ? (
                <View style={styles.rowBetween}>
                  <View style={styles.nowWrap}>
                    <Text style={styles.nowLabel}>Now</Text>
                    <Text
                      style={[
                        styles.nowTitle,
                        arabicAware(current.title, 13),
                        isArabicText(current.title) && styles.arabicTight,
                      ]}
                      numberOfLines={1}
                    >
                      {current.title}
                    </Text>
                  </View>
                  {current.lastRating ? <RatingBadge rating={current.lastRating} /> : null}
                </View>
              ) : total > 0 ? (
                <View style={styles.readyRow}>
                  <Ionicons name="trophy" size={14} color={Colors.success} />
                  <Text
                    style={[styles.hint, { color: Colors.success, fontFamily: Fonts.semibold }]}
                  >
                    All chapters completed – ready to promote
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      {completed.length > 0 ? (
        <View style={styles.completedRow}>
          <Ionicons name="checkmark-done-circle" size={16} color={Colors.success} />
          <Text style={styles.hint}>
            Completed: {completed.map((c) => c.book.title).join(', ')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
  },
  subtitle: {
    ...Typography.caption,
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  link: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    color: Colors.primary,
  },
  book: {
    gap: 6,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  bookTitle: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  count: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  countTotal: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  barTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  nowWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nowLabel: {
    ...Typography.overline,
    fontSize: 10,
    color: Colors.accentDark,
  },
  nowTitle: {
    ...Typography.bodySmall,
    fontFamily: Fonts.medium,
    color: Colors.text,
    flexShrink: 1,
  },
  arabicTight: {
    lineHeight: 26,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hint: {
    ...Typography.bodySmall,
    flexShrink: 1,
  },
});
