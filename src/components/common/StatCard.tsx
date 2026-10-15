import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../config/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  bgColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = Colors.primary,
  bgColor = Colors.primaryLight,
  onPress,
  style,
}) => {
  const content = (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...Typography.titleLarge,
    fontWeight: '800',
    color: Colors.text,
  },
  title: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
