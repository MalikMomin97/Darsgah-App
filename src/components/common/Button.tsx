import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../config/theme';

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
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
      alignSelf: fullWidth ? 'stretch' : 'auto',
    };

    // Size
    switch (size) {
      case 'sm':
        base.paddingVertical = Spacing.xs + 2;
        base.paddingHorizontal = Spacing.md;
        break;
      case 'lg':
        base.paddingVertical = Spacing.md + 2;
        base.paddingHorizontal = Spacing.xl;
        break;
      case 'md':
      default:
        base.paddingVertical = Spacing.md;
        base.paddingHorizontal = Spacing.lg;
        break;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        base.backgroundColor = Colors.surfaceSubtle;
        base.borderWidth = 1;
        base.borderColor = Colors.borderDark;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = Colors.primary;
        break;
      case 'danger':
        base.backgroundColor = Colors.danger;
        break;
      case 'success':
        base.backgroundColor = Colors.success;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'primary':
      default:
        base.backgroundColor = Colors.primary;
        break;
    }

    if (disabled || loading) {
      base.opacity = 0.55;
    }

    return base;
  };

  const getTextColor = (): string => {
    if (variant === 'outline' || variant === 'ghost') return Colors.primary;
    if (variant === 'secondary') return Colors.text;
    return Colors.textInverse;
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 13;
      case 'lg':
        return 16;
      case 'md':
      default:
        return 15;
    }
  };

  const textColor = getTextColor();
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" style={styles.spinner} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' ? (
            <Ionicons
              name={icon}
              size={iconSize}
              color={textColor}
              style={{ marginRight: Spacing.xs }}
            />
          ) : null}
          <Text
            style={[
              Typography.button,
              { color: textColor, fontSize: getFontSize() },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons
              name={icon}
              size={iconSize}
              color={textColor}
              style={{ marginLeft: Spacing.xs }}
            />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    paddingVertical: 2,
  },
});
