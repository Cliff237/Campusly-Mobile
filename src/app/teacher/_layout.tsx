import { useCallback } from 'react';
import { Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { TeacherTopNav } from '@/components/teacher/TeacherTopNav';

/** Teacher routes have their own capability-aware top and bottom navigation. */
export default function TeacherLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  // Leaving the teacher workspace from its home tab returns to Discover rather
  // than closing the application on Android.
  const isTeacherHome = segments.length === 2 && segments[0] === 'teacher' && segments[1] === 'home';
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isTeacherHome) return false;
      router.replace('/(tabs)/discover');
      return true;
    });
    return () => subscription.remove();
  }, [isTeacherHome, router]));

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <TeacherTopNav />
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: dark ? '#171326' : '#ffffff', borderTopColor: dark ? '#44345d' : '#e4e1ee', height: 82, paddingTop: 7 }, tabBarActiveTintColor: '#6d28d9', tabBarInactiveTintColor: dark ? '#b7aecb' : '#706b82', tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
        <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="courses/[id]" options={{ href: null }} />
        <Tabs.Screen name="courses/[id]/settings" options={{ href: null }} />
        <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="roster" options={{ title: 'Roster', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="marks" options={{ href: null }} />
        <Tabs.Screen name="attendance" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="teacher" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
