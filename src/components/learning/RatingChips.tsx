import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Fonts } from '../../config/theme';
import { Rating } from '../../types';
import { RATINGS, RATING_LABELS } from '../../services/learningService';
import { PressableScale, haptic } from '../common/Motion';

export const RATING_COLORS: Record<Rating, { fg: string; bg: string }> = {
  excellent: { fg: Colors.success, bg: Colors.successLight },
  good: { fg: Colors.info, bg: Colors.infoLight },
  needs_improvement: { fg: Colors.warning, bg: Colors.warningLight },
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
  <View style={styles.row} accessibilityRole="radiogroup">
    {RATINGS.map((r) => {
      const active = value === r;
      const c = RATING_COLORS[r];
      return (
        <PressableScale
          key={r}
          pressedScale={0.93}
          style={[styles.chip, active && { backgroundColor: c.bg, borderColor: c.fg }]}
          onPress={() => {
            haptic.select();
            onChange(active ? null : r);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: active }}
          accessibilityLabel={RATING_LABELS[r]}
        >
          <View style={[styles.dot, { backgroundColor: c.fg }, !active && styles.dotIdle]} />
          <Text
            style={[styles.text, active && { color: c.fg, fontFamily: Fonts.bold }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {SHORT_LABELS[r]}
          </Text>
        </PressableScale>
      );
    })}
  </View>
);

export const RatingBadge: React.FC<{ rating: Rating }> = ({ rating }) => (
  <View style={[styles.badge, { backgroundColor: RATING_COLORS[rating].bg }]}>
    <View style={[styles.badgeDot, { backgroundColor: RATING_COLORS[rating].fg }]} />
    <Text style={[styles.badgeText, { color: RATING_COLORS[rating].fg }]} numberOfLines={1}>
      {RATING_LABELS[rating]}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
  },
  dotIdle: {
    opacity: 0.45,
  },
  text: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 1,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: Fonts.semibold,
    fontSize: 11.5,
    lineHeight: 15,
  },
});
