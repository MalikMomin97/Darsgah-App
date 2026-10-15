import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
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
        <Text style={styles.title}>Learning</Text>
        <Text style={styles.link}>Open</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </View>

      {active.length === 0 ? (
        <Text style={styles.hint}>No books assigned yet. Tap to assign books.</Text>
      ) : (
        active.map((p) => {
          const total = p.chapters.length;
          const current = p.chapters.find((c) => c.id === p.currentChapterId);
          return (
            <View key={p.book.id} style={styles.book}>
              <View style={styles.rowBetween}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {p.book.title}
                </Text>
                <Text style={styles.count}>
                  {p.completedCount}/{total}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${total > 0 ? Math.round((p.completedCount / total) * 100) : 0}%` },
                  ]}
                />
              </View>
              {current ? (
                <View style={styles.rowBetween}>
                  <Text style={styles.hint} numberOfLines={1}>
                    Now: {current.title}
                  </Text>
                  {current.lastRating ? <RatingBadge rating={current.lastRating} /> : null}
                </View>
              ) : total > 0 ? (
                <Text style={[styles.hint, { color: Colors.success }]}>
                  All chapters completed – ready to promote
                </Text>
              ) : null}
            </View>
          );
        })
      )}

      {completed.length > 0 ? (
        <Text style={styles.hint}>
          Completed: {completed.map((c) => c.book.title).join(', ')}
        </Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  title: {
    ...Typography.titleSmall,
    flex: 1,
  },
  link: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
  },
  book: {
    gap: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  bookTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
  },
  count: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.primary,
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
  hint: {
    ...Typography.bodySmall,
    flexShrink: 1,
  },
});
