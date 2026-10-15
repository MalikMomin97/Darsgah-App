import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../config/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof Spacing;
  elevation?: keyof typeof Shadows;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  padding = 'lg',
  elevation = 'sm',
}) => {
  const containerStyle: ViewStyle = {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[padding],
    ...Shadows[elevation],
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[containerStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
};
