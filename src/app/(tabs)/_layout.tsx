import { ColorValue, Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Shadows } from '../../config/theme';
import { haptic } from '../../components/common/Motion';

type IconPair = [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap];

/** Tab icon; the active tab sits in a soft emerald pill. */
function tabIcon([active, inactive]: IconPair) {
  return function TabIcon({ color, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return (
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Ionicons name={focused ? active : inactive} size={21} color={color as string} />
      </View>
    );
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 10);

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          height: 64 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
          ...Shadows.lg,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.semibold,
          fontSize: 11,
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarLabel: 'Home', tabBarIcon: tabIcon(['home', 'home-outline']) }}
      />
      <Tabs.Screen
        name="students"
        options={{ tabBarLabel: 'Students', tabBarIcon: tabIcon(['people', 'people-outline']) }}
      />
      <Tabs.Screen
        name="curriculum"
        options={{
          tabBarLabel: 'Curriculum',
          tabBarIcon: tabIcon(['library', 'library-outline']),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: tabIcon(['calendar', 'calendar-outline']),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: tabIcon(['stats-chart', 'stats-chart-outline']),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: Colors.primaryLight,
  },
});
