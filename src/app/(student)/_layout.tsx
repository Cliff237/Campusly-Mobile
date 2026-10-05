import { useCallback } from 'react';
import { Redirect, Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthContext';
import { TopNav } from '@/components/student/shared/TopNav';
import { useAppTheme } from '@/ui/useAppTheme';
import { tabIcon, useTabBarOptions } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';

export default function StudentTabLayout() {
  const { currentMembership, isReady } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useAppTheme();
  const options = useTabBarOptions();
  const isRoleHome = segments.length === 2 && segments[0] === '(student)';

  // At the top level of any student tab, Android back returns to Discover.
  // Detail screens still keep their normal in-workspace back navigation.
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isRoleHome) return false;
      router.replace('/(tabs)/discover');
      return true;
    });
    return () => subscription.remove();
  }, [isRoleHome, router]));

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!currentMembership) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopNav />
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
          name="marks"
          options={{
            title: 'Marks',
            tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline'),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
            },
          }}
        />
        <Tabs.Screen name="notifications" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="compose" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="attendance" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
    </SafeAreaView>
  );
}
