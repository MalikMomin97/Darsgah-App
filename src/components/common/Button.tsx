import React from 'react';
import { Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Gradients, Shadows } from '../../config/theme';
import { PressableScale } from './Motion';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 38, md: 50, lg: 56 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 16 };
const ICON_SIZE: Record<ButtonSize, number> = { sm: 15, md: 18, lg: 20 };

const VARIANT: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: Colors.primary, fg: Colors.textInverse },
  secondary: { bg: Colors.surfaceSubtle, fg: Colors.text },
  outline: { bg: 'transparent', fg: Colors.primary, border: Colors.primary },
  danger: { bg: Colors.danger, fg: Colors.textInverse },
  ghost: { bg: 'transparent', fg: Colors.primary },
  success: { bg: Colors.success, fg: Colors.textInverse },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const v = VARIANT[variant];
  const inactive = disabled || loading;
  const radius = size === 'sm' ? BorderRadius.sm : BorderRadius.md;

  const content = loading ? (
    <ActivityIndicator color={v.fg} size="small" />
  ) : (
    <View style={styles.row}>
      {icon && iconPosition === 'left' ? (
        <Ionicons name={icon} size={ICON_SIZE[size]} color={v.fg} style={styles.iconLeft} />
      ) : null}
      <Text
        style={[Typography.button, { color: v.fg, fontSize: FONT_SIZE[size] }, textStyle]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {icon && iconPosition === 'right' ? (
        <Ionicons name={icon} size={ICON_SIZE[size]} color={v.fg} style={styles.iconRight} />
      ) : null}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      hapticOnPress
      pressedScale={0.97}
      style={[
        styles.base,
        {
          minHeight: HEIGHT[size],
          borderRadius: radius,
          paddingHorizontal: size === 'sm' ? Spacing.md : Spacing.xl,
          backgroundColor: v.bg,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
        variant === 'primary' && !inactive ? Shadows.md : null,
        inactive ? styles.inactive : null,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={Gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : null}
      {content}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  inactive: {
    opacity: 0.5,
  },
});
