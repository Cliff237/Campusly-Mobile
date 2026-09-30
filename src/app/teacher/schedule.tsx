import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

export default function TeacherScheduleScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try { setClasses(await fetchTeacherClasses(accessToken)); }
    catch (error) { console.error('[Teacher schedule] load failed', error); }
    finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);
  useEffect(() => { void load(); }, [load]);
  return <ScrollView className="flex-1 bg-bg dark:bg-bg-dark" contentContainerStyle={{ padding: 20, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#5b3fd1" />}>
    <ThemedText variant="display">Schedule</ThemedText>
    <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1 mb-5">Select a class and course to create exams, enter marks, and view results.</ThemedText>
    {loading ? <ActivityIndicator color="#5b3fd1" className="py-20" /> : !classes.length ? <EmptyStateAnimation icon="calendar-outline" title="No assigned classes" subtitle="Your assigned classes will appear here." /> : <>
      <ThemedText variant="subheading" className="mb-3">Assigned classes</ThemedText>
      {classes.map((item) => <View key={item.id} className="flex-row mb-3"><View className="w-1 rounded-full bg-primary mr-3" /><View className="flex-1 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4"><ThemedText variant="caption" className="font-bold">{item.course_name}</ThemedText><ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">{item.course_code} · {item.section} · {item.enrolled_count} students</ThemedText><TouchableOpacity onPress={() => router.push('/teacher/marks')} className="mt-3 self-start rounded-xl bg-primary-soft px-3 py-2"><ThemedText variant="tiny" className="text-primary font-semibold">Manage exams & marks</ThemedText></TouchableOpacity></View></View>)}
    </>}
  </ScrollView>;
}
