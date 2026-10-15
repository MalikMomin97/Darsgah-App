import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius, Fonts } from '../../config/theme';
import { PressableScale } from './Motion';

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

/** Screen header: round back button, bold title with optional subtitle, pill action. */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
  safeTop = true,
}) => {
  const insets = useSafeAreaInsets();
  const actionColor = rightAction?.color || Colors.primary;

  return (
    <View style={[styles.container, safeTop && { paddingTop: Spacing.md + insets.top }, style]}>
      {onBack ? (
        <PressableScale
          style={styles.backButton}
          onPress={onBack}
          pressedScale={0.9}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </PressableScale>
      ) : null}

      <View style={styles.titleContainer}>
        <Text style={[styles.title, !onBack && styles.titleRoot]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? (
        <PressableScale
          style={[styles.rightButton, !rightAction.label && styles.rightButtonIconOnly]}
          onPress={rightAction.onPress}
          pressedScale={0.94}
          hapticOnPress
        >
          {rightAction.icon ? (
            <Ionicons name={rightAction.icon} size={18} color={actionColor} />
          ) : null}
          {rightAction.label ? (
            <Text style={[styles.rightButtonText, { color: actionColor }]}>
              {rightAction.label}
            </Text>
          ) : null}
        </PressableScale>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    minHeight: 60,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...Typography.titleMedium,
  },
  titleRoot: {
    ...Typography.titleLarge,
  },
  subtitle: {
    ...Typography.bodySmall,
    marginTop: 1,
  },
  rightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  rightButtonIconOnly: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  rightButtonText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
});
