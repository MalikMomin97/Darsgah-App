import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '../db/database';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { Button } from '../components/common/Button';
import { Colors, Spacing, Typography } from '../config/theme';

/**
 * Root layout: opens the local SQLite database (running migrations) before any screen renders.
 */
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const initApp = useCallback(async () => {
    try {
      await getDatabase();
      setDbReady(true);
    } catch (error: any) {
      console.error('[App] Database init error:', error);
      setInitError(error?.message || 'Failed to initialize local SQLite database.');
    }
  }, []);

  useEffect(() => {
    (async () => await initApp())();
  }, [initApp]);

  const handleRetry = () => {
    setInitError(null);
    initApp();
  };

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <Button title="Retry Initialization" onPress={handleRetry} variant="primary" />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!dbReady) {
    return (
      <>
        <LoadingScreen message="Initializing offline database..." />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    ...Typography.titleMedium,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
