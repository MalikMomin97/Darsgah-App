import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../config/theme';
import { PressableScale } from './Motion';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof Spacing;
  elevation?: keyof typeof Shadows;
}

/** White rounded surface with a hairline border and soft shadow; springs when tappable. */
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
      <PressableScale style={[containerStyle, style]} onPress={onPress} pressedScale={0.985}>
        {children}
      </PressableScale>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
};
