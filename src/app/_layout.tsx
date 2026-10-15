import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { getDatabase } from '../db/database';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { Button } from '../components/common/Button';
import { Colors, Spacing, Typography } from '../config/theme';

/**
 * Root layout: loads the app fonts and opens the local SQLite database (running migrations)
 * before any screen renders.
 */
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  // A font load failure falls back to system fonts rather than blocking the app
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Amiri_400Regular,
    Amiri_700Bold,
  });

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

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.fontGate}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

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
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  fontGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
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
