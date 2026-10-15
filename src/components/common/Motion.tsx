import React, { useEffect, useState } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

/*
 * Motion uses React Native's built-in Animated API with the native driver.
 * Deliberately not react-native-reanimated: its worklets must match the version built into the
 * client app exactly (Expo Go / dev build), and a mismatch crashes the app at startup.
 */

/** Light haptic feedback; silently ignored where unsupported. */
export const haptic = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  select: () => Haptics.selectionAsync().catch(() => undefined),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};

interface FadeInViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Position in a list or section; staggers the entry (capped so long lists stay snappy). */
  index?: number;
  /** Extra delay in ms before the entry starts. */
  delay?: number;
  /** Distance in px the view rises while fading in; 0 for a plain fade. */
  rise?: number;
}

/** View that fades in and rises slightly when it mounts: staggered entry for lists and sections. */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  style,
  index = 0,
  delay = 0,
  rise = 14,
}) => {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: 1,
      delay: delay + Math.min(index, 10) * 45,
      damping: 18,
      stiffness: 160,
      mass: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, index, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 0.6, 1],
            outputRange: [0, 1, 1],
            extrapolate: 'clamp',
          }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const SPRING = { damping: 16, stiffness: 320, mass: 0.6, useNativeDriver: true };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale reached while pressed. */
  pressedScale?: number;
  /** Haptic tap on press. */
  hapticOnPress?: boolean;
  children?: React.ReactNode;
}

/** Pressable that springs down slightly while touched: the base of every tappable surface. */
export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  pressedScale = 0.97,
  hapticOnPress = false,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}) => {
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(1));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        Animated.spring(scale, { toValue: pressedScale, ...SPRING }).start();
        Animated.timing(opacity, { toValue: 0.92, duration: 90, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(scale, { toValue: 1, ...SPRING }).start();
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticOnPress) haptic.tap();
        onPress?.(e);
      }}
      style={[style, { opacity, transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
};
