import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Fonts } from '../../config/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  required?: boolean;
}

/** Text field with a label, soft fill, and an emerald focus ring. */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  required = false,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const iconColor = error ? Colors.danger : focused ? Colors.primary : Colors.textMuted;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.requiredAsterisk}>*</Text> : null}
        </View>
      ) : null}

      {/* Focus only recolours the wrapper: toggling elevation/shadow here re-creates the native
          view on Android, which blurs the TextInput as soon as it gains focus. */}
      <View
        collapsable={false}
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
          rest.multiline ? styles.multilineWrapper : null,
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={19} color={iconColor} style={styles.leftIcon} />
        ) : null}

        <TextInput
          style={[styles.input, rest.multiline ? styles.multilineInput : null, style]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          cursorColor={Colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIcon}
            hitSlop={8}
          >
            <Ionicons name={rightIcon} size={19} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={13} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 3,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  requiredAsterisk: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.danger,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    minHeight: 52,
    paddingHorizontal: Spacing.md + 2,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerTint,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    minHeight: 96,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Spacing.sm + 2,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
    padding: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
  },
  helperText: {
    ...Typography.caption,
    marginTop: 6,
  },
});
