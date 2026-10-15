import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows, Fonts } from '../../config/theme';

interface LoadingScreenProps {
  message?: string;
}

/** Centred spinner in a soft medallion. Uses system-safe styles so it can render before fonts load. */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading data...' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.medallion}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  medallion: {
    width: 76,
    height: 76,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  message: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
});
