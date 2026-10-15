import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography } from '../../config/theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading data...',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
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
  message: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
