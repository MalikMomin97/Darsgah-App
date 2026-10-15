import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'file-tray-outline',
  title,
  description,
  actionTitle,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={42} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onActionPress ? (
        <Button
          title={actionTitle}
          onPress={onActionPress}
          variant="primary"
          size="md"
          icon="add"
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginVertical: Spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.titleSmall,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: Spacing.xs,
  },
});
