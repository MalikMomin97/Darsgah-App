import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Rating } from '../../types';
import { RATINGS, RATING_LABELS } from '../../services/learningService';

export const RATING_COLORS: Record<Rating, { fg: string; bg: string }> = {
  excellent: { fg: Colors.success, bg: Colors.successLight },
  good: { fg: Colors.info, bg: Colors.infoLight },
  needs_improvement: { fg: Colors.accent, bg: Colors.accentLight },
  bad: { fg: Colors.danger, bg: Colors.dangerLight },
};

/** Short labels so four chips fit on one row on small phones. */
const SHORT_LABELS: Record<Rating, string> = {
  excellent: 'Excellent',
  good: 'Good',
  needs_improvement: 'Needs Impr.',
  bad: 'Bad',
};

interface RatingChipsProps {
  value: Rating | null;
  /** Tapping the selected chip again clears it. */
  onChange: (value: Rating | null) => void;
}

export const RatingChips: React.FC<RatingChipsProps> = ({ value, onChange }) => (
  <View style={styles.row}>
    {RATINGS.map((r) => {
      const active = value === r;
      const c = RATING_COLORS[r];
      return (
        <TouchableOpacity
          key={r}
          style={[styles.chip, active && { backgroundColor: c.bg, borderColor: c.fg }]}
          onPress={() => onChange(active ? null : r)}
          activeOpacity={0.7}
          accessibilityLabel={RATING_LABELS[r]}
        >
          <Text
            style={[styles.text, active && { color: c.fg, fontWeight: '700' }]}
            numberOfLines={1}
          >
            {SHORT_LABELS[r]}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const RatingBadge: React.FC<{ rating: Rating }> = ({ rating }) => (
  <View style={[styles.badge, { backgroundColor: RATING_COLORS[rating].bg }]}>
    <Text style={[styles.badgeText, { color: RATING_COLORS[rating].fg }]}>
      {RATING_LABELS[rating]}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  text: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
