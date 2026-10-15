import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../config/theme';

interface IconCircleProps {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  bg?: string;
  /** Outer size in px; the glyph scales with it. */
  size?: number;
  /** Rounded square instead of a circle. */
  square?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Tinted icon medallion used in list rows, cards and headers. */
export const IconCircle: React.FC<IconCircleProps> = ({
  icon,
  color = Colors.primary,
  bg = Colors.primaryLight,
  size = 40,
  square = false,
  style,
}) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: square ? Math.round(size * 0.32) : BorderRadius.full,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      },
      style,
    ]}
  >
    <Ionicons name={icon} size={Math.round(size * 0.48)} color={color} />
  </View>
);
