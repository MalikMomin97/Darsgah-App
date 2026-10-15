import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows, Fonts } from '../../config/theme';
import { PressableScale } from './Motion';

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

/** Compact metric tile: tinted icon, large number, label. */
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
      <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
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
      <PressableScale onPress={onPress} style={styles.touchable}>
        {content}
      </PressableScale>
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
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  value: {
    fontFamily: Fonts.extrabold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  title: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
});
