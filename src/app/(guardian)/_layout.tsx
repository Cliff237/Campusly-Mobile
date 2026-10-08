// src/app/(guardian)/_layout.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { Redirect, Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth/AuthContext';
import { useAppTheme } from '@/ui/useAppTheme';
import { tabIcon, useTabBarOptions } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';
import { GuardianTopNav } from '@/components/guardian/GuardianTopNav';
import { fetchGuardianStudents, LinkedStudent } from '@/lib/api/guardian';

export default function GuardianTabLayout() {
  const { currentMembership, isReady, isAuthenticated, accessToken } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useAppTheme();
  const options = useTabBarOptions();

  const isRoleHome = segments.length === 2 && segments[0] === '(guardian)';

  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);

  // Load linked students
  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      if (!currentMembership?.institution_id || !accessToken) return;
      try {
        const students = await fetchGuardianStudents(
          currentMembership.institution_id,
          accessToken,
        );
        if (isMounted && students.length > 0) {
          setLinkedStudents(students);
          setSelectedStudent((prev) => prev || students[0]);
        }
      } catch (err) {
        console.warn('[GuardianLayout] Could not load linked students:', err);
      }
    }
    loadStudents();
    return () => {
      isMounted = false;
    };
  }, [currentMembership?.institution_id, accessToken]);

  // At the top level of any guardian tab, Android back returns to Discover.
  // Detail screens and sub-routes safely fall back to guardian home.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isRoleHome) {
          router.replace('/(tabs)/discover');
          return true;
        }
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        router.replace('/(guardian)/home');
        return true;
      });
      return () => subscription.remove();
    }, [isRoleHome, router]),
  );

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  if (!currentMembership) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <GuardianTopNav
        currentStudent={selectedStudent}
        linkedStudents={linkedStudents}
        onSelectStudent={(student) => setSelectedStudent(student)}
      />
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
          name="attendance"
          options={{
            title: 'Attendance',
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
            title: 'Performance',
            tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline'),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
            },
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
