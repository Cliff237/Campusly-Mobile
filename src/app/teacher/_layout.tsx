import { useCallback } from 'react';
import { Redirect, Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TeacherTopNav } from '@/components/teacher/TeacherTopNav';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAppTheme } from '@/ui/useAppTheme';
import { tabIcon, useTabBarOptions } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';

/** Teacher routes have their own capability-aware top and bottom navigation. */
export default function TeacherLayout() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useAppTheme();
  const options = useTabBarOptions();

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

  if (isReady && !isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TeacherTopNav />
      <Tabs screenOptions={options}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: tabIcon('home', 'home-outline'),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
            },
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            title: 'Courses',
            tabBarIcon: tabIcon('book', 'book-outline'),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
            },
          }}
        />
        <Tabs.Screen name="courses/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="courses/[id]/settings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: tabIcon('calendar', 'calendar-outline'),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
            },
          }}
        />
        <Tabs.Screen
          name="roster"
          options={{
            title: 'Roster',
            tabBarIcon: tabIcon('people', 'people-outline'),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
            },
          }}
        />
        <Tabs.Screen name="marks" options={{ href: null }} />
        <Tabs.Screen name="attendance" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="teacher" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
