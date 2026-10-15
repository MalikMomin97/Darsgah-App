import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../config/theme';

type IconPair = [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap];

function tabIcon([active, inactive]: IconPair) {
  return function TabIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color as string} />;
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarLabel: 'Dashboard', tabBarIcon: tabIcon(['home', 'home-outline']) }}
      />
      <Tabs.Screen
        name="students"
        options={{ tabBarLabel: 'Students', tabBarIcon: tabIcon(['people', 'people-outline']) }}
      />
      <Tabs.Screen
        name="curriculum"
        options={{ tabBarLabel: 'Curriculum', tabBarIcon: tabIcon(['book', 'book-outline']) }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: tabIcon(['checkbox', 'checkbox-outline']),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: tabIcon(['bar-chart', 'bar-chart-outline']),
        }}
      />
    </Tabs>
  );
}
