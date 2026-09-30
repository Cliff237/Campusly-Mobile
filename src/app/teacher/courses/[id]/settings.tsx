import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/ui/ThemedText';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchInstitutionMemberPosts } from '@/lib/api/student';
import { fetchAttendanceRecords, fetchAttendanceRoster, fetchAttendanceSessions, type AttendanceRecordSummary } from '@/lib/api/attendance';
import type { StudentFeedPost } from '@/lib/types/student';
import type { AttendanceRosterStudent, AttendanceSessionSummary } from '@/lib/types/attendance';

export default function CourseGroupSettingsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { accessToken, currentMembership } = useAuth();
  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [roster, setRoster] = useState<AttendanceRosterStudent[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionSummary[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecordSummary[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken || !currentMembership || !id) return;
    setLoading(true);
    try {
      const [coursePosts, students, attendance] = await Promise.all([
        fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, { scope: 'course_specific', course_id: id }),
        fetchAttendanceRoster(id, accessToken),
        fetchAttendanceSessions(id, accessToken),
      ]);
      const recordPairs = await Promise.all(attendance.map(async (session) => [session.id, await fetchAttendanceRecords(session.id, accessToken)] as const));
      setPosts(coursePosts);
      setRoster(students);
      setSessions(attendance);
      setRecords(Object.fromEntries(recordPairs));
    } catch (error) {
      console.error('[Course group settings] load failed', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentMembership, id]);

  useEffect(() => { void load(); }, [load]);

  const media = useMemo(() => posts.flatMap((post) => post.media.filter((item) => item.type === 'image' || item.type === 'video')), [posts]);
  const absenceCount = (membershipId: string) => sessions.reduce((total, session) => total + ((records[session.id] ?? []).some((record) => record.membership_id === membershipId && record.status === 'absent') ? 1 : 0), 0);
  const absenceHours = (membershipId: string) => sessions.reduce((total, session) => {
    const absent = (records[session.id] ?? []).some((record) => record.membership_id === membershipId && record.status === 'absent');
    const duration = Number(session.period?.match(/(\d+)m/)?.[1] ?? 60);
    return total + (absent ? duration / 60 : 0);
  }, 0);

  return <View className="flex-1 bg-mist dark:bg-bg-dark">
    <View className="flex-row items-center border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 py-3">
      <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center"><Ionicons name="chevron-back" size={24} color="#6d28d9" /></TouchableOpacity>
      <View className="flex-1 ml-2"><ThemedText variant="heading">{name || 'Course group'}</ThemedText><ThemedText variant="tiny">Group settings and activity</ThemedText></View>
    </View>
    {loading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color="#6d28d9" /></View> : <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#6d28d9" />} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <ThemedText variant="subheading">Shared media</ThemedText>
      {media.length ? <View className="flex-row flex-wrap gap-2 mt-3">{media.map((item, index) => item.type === 'image' ? <Image key={`${item.url}-${index}`} source={{ uri: item.url }} className="w-[31%] aspect-square rounded-2xl" /> : <View key={`${item.url}-${index}`} className="w-[31%] aspect-square rounded-2xl bg-ink items-center justify-center"><Ionicons name="play-circle" size={30} color="#fff" /><ThemedText variant="tiny" className="text-white mt-1">Video</ThemedText></View>)}</View> : <ThemedText variant="caption" className="text-text-muted mt-2">No shared media yet.</ThemedText>}
      <ThemedText variant="subheading" className="mt-7">People in this group</ThemedText>
      <View className="mt-3 rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-4">{roster.map((student) => <View key={student.membership_id} className="flex-row items-center py-3 border-b border-border dark:border-border-dark"><View className="h-10 w-10 rounded-full bg-primary-soft items-center justify-center"><ThemedText variant="caption" className="text-primary font-bold">{student.full_name.slice(0, 1).toUpperCase()}</ThemedText></View><View className="flex-1 ml-3"><ThemedText variant="caption" className="font-semibold">{student.full_name}</ThemedText><ThemedText variant="tiny" className="text-text-muted">{absenceCount(student.membership_id)} absence session{absenceCount(student.membership_id) === 1 ? '' : 's'} · {absenceHours(student.membership_id).toFixed(1)}h absent</ThemedText></View></View>)}</View>
      <ThemedText variant="subheading" className="mt-7">Attendance history</ThemedText>
      <View className="mt-3 rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-4">{sessions.length ? sessions.map((session) => <View key={session.id} className="flex-row items-center py-3 border-b border-border dark:border-border-dark"><Ionicons name="calendar-outline" size={20} color="#0f766e" /><View className="flex-1 ml-3"><ThemedText variant="caption">{new Date(session.session_date).toLocaleString()}</ThemedText><ThemedText variant="tiny" className="text-text-muted">{session.period || 'Attendance session'} · {session.status}</ThemedText></View></View>) : <ThemedText variant="caption" className="py-4 text-text-muted">No attendance sessions yet.</ThemedText>}</View>
    </ScrollView>}
  </View>;
}
