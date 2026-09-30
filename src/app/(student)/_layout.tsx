import { useCallback } from 'react';
import { Redirect, Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/lib/auth/AuthContext';
import { TopNav } from '@/components/student/shared/TopNav';

export default function StudentTabLayout() {
  const { currentMembership, isReady } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const activeColor = '#5b3fd1';
  const inactiveColor = isDark ? '#64748b' : '#94a3b8';
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
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
        <ActivityIndicator size="large" color={activeColor} />
      </View>
    );
  }

  if (!currentMembership) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <TopNav />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderTopColor: isDark ? '#334155' : '#e2e8f0',
            paddingBottom: 8,
            paddingTop: 8,
            height: 85,
          },
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarLabelStyle: {
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            title: 'Courses',
            tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
          }}
        />
        <Tabs.Screen name="courses/[id]" options={{ href: null }} />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="marks"
          options={{
            title: 'Marks',
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="compose" options={{ href: null }} />
        <Tabs.Screen name="attendance" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
