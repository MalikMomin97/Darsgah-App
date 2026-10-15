import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Fonts } from '../../config/theme';

interface SectionHeaderProps {
  title: string;
  /** Small muted text after the title, e.g. a count. */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Title row above a group of cards, with an optional "See all"-style action. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  meta,
  actionLabel,
  onAction,
  style,
}) => (
  <View style={[styles.row, style]}>
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
    {actionLabel && onAction ? (
      <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
        <Text style={styles.actionText}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
  meta: {
    ...Typography.caption,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: Colors.primary,
  },
});
