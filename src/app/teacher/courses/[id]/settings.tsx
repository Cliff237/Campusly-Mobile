import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchInstitutionMemberPosts } from '@/lib/api/student';
import {
  fetchAttendanceRecords,
  fetchAttendanceRoster,
  fetchAttendanceSessions,
  type AttendanceRecordSummary,
} from '@/lib/api/attendance';
import type { StudentFeedPost } from '@/lib/types/student';
import type { AttendanceRosterStudent, AttendanceSessionSummary } from '@/lib/types/attendance';

export default function CourseGroupSettingsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
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
        fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, {
          scope: 'course_specific',
          course_id: id,
        }),
        fetchAttendanceRoster(id, accessToken),
        fetchAttendanceSessions(id, accessToken),
      ]);
      const recordPairs = await Promise.all(
        attendance.map(
          async (session) => [session.id, await fetchAttendanceRecords(session.id, accessToken)] as const,
        ),
      );
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

  useEffect(() => {
    void load();
  }, [load]);

  const media = useMemo(
    () => posts.flatMap((post) => post.media.filter((item) => item.type === 'image' || item.type === 'video')),
    [posts],
  );

  const absenceCount = (membershipId: string) =>
    sessions.reduce(
      (total, session) =>
        total +
        ((records[session.id] ?? []).some(
          (record) => record.membership_id === membershipId && record.status === 'absent',
        )
          ? 1
          : 0),
      0,
    );

  const absenceHours = (membershipId: string) =>
    sessions.reduce((total, session) => {
      const absent = (records[session.id] ?? []).some(
        (record) => record.membership_id === membershipId && record.status === 'absent',
      );
      const duration = Number(session.period?.match(/(\d+)m/)?.[1] ?? 60);
      return total + (absent ? duration / 60 : 0);
    }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <AppText variant="heading" weight="extrabold" numberOfLines={1}>
            {name || 'Course Group Settings'}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
            Class activity, media & attendance log
          </AppText>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand} size="large" />
          <AppText variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading course records…
          </AppText>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.brand} />
          }
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Shared Media Gallery */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppText variant="subheading" weight="bold">
                Shared Media & Files
              </AppText>
              <AppText variant="caption" tone="muted">
                {media.length} items
              </AppText>
            </View>

            {media.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {media.map((item, index) =>
                  item.type === 'image' ? (
                    <Image
                      key={`${item.url}-${index}`}
                      source={{ uri: item.url }}
                      style={{
                        width: '31%',
                        aspectRatio: 1,
                        borderRadius: 16,
                        backgroundColor: colors.surfaceMuted,
                      }}
                    />
                  ) : (
                    <View
                      key={`${item.url}-${index}`}
                      style={{
                        width: '31%',
                        aspectRatio: 1,
                        borderRadius: 16,
                        backgroundColor: '#1E143E',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                      <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF', marginTop: 4 }}>
                        Video
                      </AppText>
                    </View>
                  ),
                )}
              </View>
            ) : (
              <View
                style={{
                  padding: 20,
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <AppText variant="caption" tone="muted">
                  No photos or videos shared in this course group yet.
                </AppText>
              </View>
            )}
          </View>

          {/* Enrolled Students / Attendance Summary */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppText variant="subheading" weight="bold">
                Enrolled Students
              </AppText>
              <AppText variant="caption" tone="muted">
                {roster.length} students
              </AppText>
            </View>

            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
              }}
            >
              {roster.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <AppText variant="caption" tone="muted">
                    No students currently enrolled in this class.
                  </AppText>
                </View>
              ) : (
                roster.map((student, idx) => {
                  const absences = absenceCount(student.membership_id);
                  const hours = absenceHours(student.membership_id);
                  const isLast = idx === roster.length - 1;

                  return (
                    <View
                      key={student.membership_id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: colors.brandSoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <AppText variant="label" weight="extrabold" tone="brand">
                          {student.full_name.slice(0, 1).toUpperCase()}
                        </AppText>
                      </View>

                      <View style={{ flex: 1 }}>
                        <AppText variant="label" weight="semibold">
                          {student.full_name}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                          {absences === 0
                            ? 'Perfect attendance record'
                            : `${absences} absence${absences === 1 ? '' : 's'} (${hours.toFixed(1)}h missed)`}
                        </AppText>
                      </View>

                      {absences > 0 ? (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            backgroundColor: colors.dangerSoft,
                          }}
                        >
                          <AppText variant="caption" weight="bold" style={{ color: colors.danger }}>
                            -{absences}
                          </AppText>
                        </View>
                      ) : (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            backgroundColor: colors.successSoft,
                          }}
                        >
                          <AppText variant="caption" weight="bold" style={{ color: colors.success }}>
                            100%
                          </AppText>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Past Attendance Sessions */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppText variant="subheading" weight="bold">
                Attendance Session Logs
              </AppText>
              <AppText variant="caption" tone="muted">
                {sessions.length} sessions
              </AppText>
            </View>

            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
              }}
            >
              {sessions.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <AppText variant="caption" tone="muted">
                    No attendance sessions recorded yet for this course.
                  </AppText>
                </View>
              ) : (
                sessions.map((session, idx) => {
                  const isLast = idx === sessions.length - 1;
                  return (
                    <View
                      key={session.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: colors.border,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: colors.brandSoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.brand} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <AppText variant="label" weight="semibold">
                          {new Date(session.session_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                          {session.period || 'Live mobile session'} · Status: {session.status}
                        </AppText>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 10,
                          backgroundColor: session.status === 'completed' ? colors.successSoft : colors.brandSoft,
                        }}
                      >
                        <AppText
                          variant="caption"
                          weight="bold"
                          style={{
                            color: session.status === 'completed' ? colors.success : colors.brand,
                          }}
                        >
                          {session.status}
                        </AppText>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
