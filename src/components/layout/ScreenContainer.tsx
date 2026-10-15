import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../config/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  edges = ['left', 'right'],
}) => {
  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  staticContent: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
});
