import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../config/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    onPress: () => void;
    color?: string;
  };
  style?: ViewStyle;
  /** Pads for the status bar. Disable for headers inside modal sheets. */
  safeTop?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
  safeTop = true,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, safeTop && { paddingTop: Spacing.md + insets.top }, style]}>
      <View style={styles.leftContainer}>
        {onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightAction ? (
        <TouchableOpacity
          style={styles.rightButton}
          onPress={rightAction.onPress}
          activeOpacity={0.7}
        >
          {rightAction.icon ? (
            <Ionicons
              name={rightAction.icon}
              size={22}
              color={rightAction.color || Colors.primary}
            />
          ) : null}
          {rightAction.label ? (
            <Text
              style={[
                styles.rightButtonText,
                { color: rightAction.color || Colors.primary },
              ]}
            >
              {rightAction.label}
            </Text>
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 56,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...Typography.titleMedium,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  rightButtonText: {
    ...Typography.button,
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
});
