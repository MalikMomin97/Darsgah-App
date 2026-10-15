import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Fonts } from '../../config/theme';
import { AttendanceStatus, ChapterStatus } from '../../types';

type BadgeType =
  | AttendanceStatus
  | ChapterStatus
  | 'needs_improvement'
  | 'active'
  | 'inactive'
  | 'archived'
  | 'custom';

interface BadgeProps {
  type?: BadgeType;
  label?: string;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  type = 'custom',
  label,
  color,
  bgColor,
  size = 'md',
  style,
}) => {
  const getBadgeConfig = () => {
    switch (type) {
      // Attendance
      case 'present':
        return { label: label || 'Present', bg: Colors.presentBg, text: Colors.present };
      case 'absent':
        return { label: label || 'Absent', bg: Colors.absentBg, text: Colors.absent };

      // Progress
      case 'completed':
        return { label: label || 'Completed', bg: Colors.completedBg, text: Colors.completed };
      case 'in_progress':
        return { label: label || 'In Progress', bg: Colors.inProgressBg, text: Colors.inProgress };
      case 'needs_improvement':
        return {
          label: label || 'Needs Work',
          bg: Colors.needsImprovementBg,
          text: Colors.needsImprovement,
        };
      case 'not_started':
        return { label: label || 'Not Started', bg: Colors.notStartedBg, text: Colors.notStarted };

      // Student Status
      case 'active':
        return { label: label || 'Active', bg: Colors.successLight, text: Colors.success };
      case 'inactive':
        return { label: label || 'Inactive', bg: Colors.surfaceSubtle, text: Colors.textSecondary };
      case 'archived':
        return { label: label || 'Archived', bg: Colors.surfaceSubtle, text: Colors.textMuted };

      case 'custom':
      default:
        return {
          label: label || '',
          bg: bgColor || Colors.surfaceSubtle,
          text: color || Colors.text,
        };
    }
  };

  const config = getBadgeConfig();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? Spacing.sm - 1 : Spacing.sm + 2,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text style={[styles.text, { color: config.text, fontSize: isSmall ? 10.5 : 12 }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: Fonts.semibold,
    textTransform: 'capitalize',
  },
});
