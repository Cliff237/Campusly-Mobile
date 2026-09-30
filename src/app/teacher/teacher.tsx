import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

export default function TeacherDashboard() {
  const router = useRouter();
  const { accessToken, currentMembership } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClasses = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await fetchTeacherClasses(accessToken);
      console.log('[Teacher dashboard] classes loaded', { count: result.length, institutionId: currentMembership?.institution_id });
      setClasses(result);
    } catch (error) {
      console.error('[Teacher dashboard] could not load classes', { error });
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, currentMembership?.institution_id]);

  useEffect(() => { void loadClasses(); }, [loadClasses]);

  // The dashboard is a role home screen, so Android back returns to the
  // campus picker rather than closing the app.
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)/discover');
      return true;
    });
    return () => subscription.remove();
  }, [router]));

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadClasses(true)} tintColor="#5b3fd1" />}
      >
        <View className="flex-row items-start justify-between mb-7">
          <View className="flex-1 pr-3">
            <ThemedText variant="display">Teaching space</ThemedText>
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1">
              {currentMembership?.institution_name || 'Your institution'}
            </ThemedText>
          </View>
          <View className="w-12 h-12 rounded-2xl bg-primary-soft items-center justify-center">
            <Ionicons name="briefcase-outline" size={23} color="#5b3fd1" />
          </View>
        </View>

        <View className="rounded-3xl bg-ink p-5 mb-6 overflow-hidden">
          <View className="absolute w-32 h-32 rounded-full bg-white/10 -right-10 -top-8" />
          <ThemedText variant="tiny" className="text-violet-soft font-semibold uppercase tracking-wider">Your teaching load</ThemedText>
          <View className="flex-row items-end mt-2">
            <ThemedText variant="display" className="text-white">{classes.length}</ThemedText>
            <ThemedText variant="caption" className="text-violet-soft ml-2 mb-1">assigned class{classes.length === 1 ? '' : 'es'}</ThemedText>
          </View>
          <ThemedText variant="caption" className="text-violet-soft mt-3">Open a class to take attendance or manage its marks.</ThemedText>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <ThemedText variant="subheading">My classes</ThemedText>
          <TouchableOpacity onPress={() => router.push('/teacher/marks')} accessibilityRole="button" accessibilityLabel="Manage all marks">
            <ThemedText variant="caption" className="text-primary font-semibold">Manage marks</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="py-16 items-center"><ActivityIndicator size="large" color="#5b3fd1" /></View>
        ) : classes.length === 0 ? (
          <EmptyStateAnimation icon="book-outline" title="No assigned classes" subtitle="Classes assigned to you will appear here." />
        ) : classes.map((item) => (
          <View key={item.id} className="rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-5 mb-3">
            <View className="flex-row items-start">
              <View className="w-11 h-11 rounded-2xl bg-primary-soft items-center justify-center">
                <ThemedText variant="caption" className="text-primary font-bold">{item.course_code.slice(0, 2).toUpperCase()}</ThemedText>
              </View>
              <View className="flex-1 ml-3">
                <ThemedText variant="subheading">{item.course_name}</ThemedText>
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">{item.course_code} · {item.section} · {item.enrolled_count} students</ThemedText>
              </View>
            </View>
            <View className="flex-row gap-2 mt-5">
              <TouchableOpacity onPress={() => router.push('/teacher/marks')} className="flex-1 rounded-xl bg-primary-soft py-3 items-center" accessibilityRole="button" accessibilityLabel={`Manage marks for ${item.course_name}`}>
                <ThemedText variant="caption" className="text-primary font-semibold">Marks</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/(student)/attendance/configure?classId=${encodeURIComponent(item.id)}&courseId=${encodeURIComponent(item.course_id)}&courseName=${encodeURIComponent(item.course_name)}` as any)}
                className="flex-1 rounded-xl bg-primary py-3 items-center"
                accessibilityRole="button"
                accessibilityLabel={`Start attendance for ${item.course_name}`}
              >
                <ThemedText variant="caption" className="text-white font-semibold">Attendance</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
