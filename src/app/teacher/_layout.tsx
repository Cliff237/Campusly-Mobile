import { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { BackHandler, View } from 'react-native';
import { useAppTheme } from '@/ui/useAppTheme';
import { tabIcon, useTabBarOptions } from '@/ui/tabBarOptions';
import { useModalsOpen } from '@/ui/modalStore';
import { TeacherTopNav } from '@/components/teacher/TeacherTopNav';

/** Teacher routes have their own capability-aware top and bottom navigation. */
export default function TeacherLayout() {
  const router = useRouter();
  // expo-router types segments as a 1-tuple; widen for length checks.
  const segments = useSegments() as readonly string[];
  const { colors } = useAppTheme();
  const options = useTabBarOptions();
  const modalsOpen = useModalsOpen();

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The violet header sits under the status bar, so its icons stay light. */}
      <StatusBar style="light" />
      <TeacherTopNav />
      <Tabs
        screenOptions={{
          ...options,
          // The bottom nav never peeks out from behind a modal / sheet.
          tabBarStyle: modalsOpen ? { ...options.tabBarStyle, display: 'none' } : options.tabBarStyle,
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }} />
        <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: tabIcon('book', 'book-outline') }} />
        <Tabs.Screen name="courses/[id]" options={{ href: null }} />
        <Tabs.Screen name="courses/[id]/settings" options={{ href: null }} />
        <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
        <Tabs.Screen name="roster" options={{ title: 'Roster', tabBarIcon: tabIcon('people', 'people-outline') }} />
        <Tabs.Screen name="marks" options={{ href: null }} />
        <Tabs.Screen name="attendance" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="teacher" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
