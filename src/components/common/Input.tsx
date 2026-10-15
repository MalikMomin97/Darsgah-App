import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../config/theme';

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
  ...rest
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
        </View>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          rest.multiline ? styles.multilineWrapper : null,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={20}
            color={Colors.textSecondary}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
            rest.multiline ? styles.multilineInput : null,
            style,
          ]}
          placeholderTextColor={Colors.textMuted}
          {...rest}
        />

        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIcon}
          >
            <Ionicons name={rightIcon} size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.text,
  },
  requiredAsterisk: {
    color: Colors.danger,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
    backgroundColor: '#FFF5F5',
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    minHeight: 88,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginRight: Spacing.xs,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.xs,
  },
  rightIcon: {
    marginLeft: Spacing.xs,
    padding: Spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: 4,
  },
  helperText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
