import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchInstitutionMemberPosts } from '@/lib/api/student';
import { fetchAttendanceRecords, fetchAttendanceRoster, fetchAttendanceSessions, type AttendanceRecordSummary } from '@/lib/api/attendance';
import type { StudentFeedPost } from '@/lib/types/student';
import type { AttendanceRosterStudent, AttendanceSessionSummary } from '@/lib/types/attendance';

/** Section heading with an optional count badge. */
function SectionHead({ title, count }: { title: string; count?: number }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 }}>
      <AppText variant="subheading">{title}</AppText>
      {count !== undefined ? (
        <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <AppText variant="caption" weight="bold" color={colors.brand} style={{ fontSize: 11.5, lineHeight: 14 }}>{count}</AppText>
        </View>
      ) : null}
    </View>
  );
}

export default function CourseGroupSettingsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { accessToken, currentMembership } = useAuth();
  const { colors, shadow, isDark } = useAppTheme();
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

  return <View style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F1F0F7' }}>
    {/* Header */}
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chevron-back" size={23} color={colors.brand} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 6 }}>
        <AppText variant="heading" numberOfLines={1} style={{ fontSize: 19, lineHeight: 24 }}>{name || 'Course group'}</AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>Group settings and activity</AppText>
      </View>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="options-outline" size={19} color={colors.brand} />
      </View>
    </View>
    {loading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.brand} /></View> : <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.brand} />} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      {/* Shared media */}
      <SectionHead title="Shared media" count={media.length} />
      {media.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{media.map((item, index) => item.type === 'image' ? <Image key={`${item.url}-${index}`} source={{ uri: item.url }} style={{ width: '31%', aspectRatio: 1, borderRadius: 18, backgroundColor: colors.surfaceMuted }} /> : <View key={`${item.url}-${index}`} style={{ width: '31%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', boxShadow: shadow.sm }}>
        <LinearGradient colors={['#43299F', '#2B1D66']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play-circle" size={30} color="#fff" />
          <AppText variant="caption" color="#FFFFFF" style={{ marginTop: 2, fontSize: 11, lineHeight: 14 }}>Video</AppText>
        </LinearGradient>
      </View>)}</View> : <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 }}>
        <AppText variant="caption" tone="muted">No shared media yet.</AppText>
      </View>}

      {/* People */}
      <SectionHead title="People in this group" count={roster.length} />
      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 14, boxShadow: shadow.sm }}>{roster.map((student, index) => {
        const absences = absenceCount(student.membership_id);
        return <View key={student.membership_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}>
          <View style={{ height: 38, width: 38, borderRadius: 19, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="caption" weight="bold" color={colors.brand}>{student.full_name.slice(0, 1).toUpperCase()}</AppText>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="label" weight="bold" numberOfLines={1}>{student.full_name}</AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>{absences} absence session{absences === 1 ? '' : 's'} · {absenceHours(student.membership_id).toFixed(1)}h absent</AppText>
          </View>
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: absences > 0 ? (isDark ? colors.surfaceMuted : '#FEF6E7') : (isDark ? colors.surfaceMuted : '#E4F7EE') }}>
            <AppText variant="caption" weight="bold" color={absences > 0 ? colors.warning : colors.success} style={{ fontSize: 11, lineHeight: 14 }}>{absences > 0 ? `${absences}×` : 'OK'}</AppText>
          </View>
        </View>;
      })}{roster.length ? null : <AppText variant="caption" tone="muted" style={{ paddingVertical: 14 }}>No students yet.</AppText>}</View>

      {/* Attendance history */}
      <SectionHead title="Attendance history" count={sessions.length} />
      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 14, boxShadow: shadow.sm }}>{sessions.length ? sessions.map((session, index) => <View key={session.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}>
        <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: isDark ? colors.surfaceMuted : '#E4F7EE', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="calendar-outline" size={17} color={colors.success} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="label" weight="bold">{new Date(session.session_date).toLocaleString()}</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>{session.period || 'Attendance session'}</AppText>
        </View>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: isDark ? colors.surfaceMuted : '#EEF2F6' }}>
          <AppText variant="caption" weight="bold" tone="muted" style={{ fontSize: 10.5, lineHeight: 13, textTransform: 'uppercase' }}>{session.status}</AppText>
        </View>
      </View>) : <AppText variant="caption" tone="muted" style={{ paddingVertical: 14 }}>No attendance sessions yet.</AppText>}</View>
    </ScrollView>}
  </View>;
}
