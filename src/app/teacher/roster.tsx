import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { API_URL } from '@/lib/config';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import {
  fetchAttendanceRecords,
  fetchAttendanceRoster,
  fetchAttendanceSessions,
  deleteAttendanceSession,
  type AttendanceRecordSummary,
} from '@/lib/api/attendance';
import type { TeacherClass } from '@/lib/types/teacherMarks';
import type { AttendanceRosterStudent, AttendanceSessionSummary } from '@/lib/types/attendance';

export default function TeacherRosterScreen() {
  const { colors } = useAppTheme();
  const bottomOffset = useBottomTabOffset(36);
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [students, setStudents] = useState<AttendanceRosterStudent[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionSummary[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecordSummary[]>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selected = useMemo(
    () => classes.find((item) => item.id === selectedId) ?? null,
    [classes, selectedId],
  );

  const loadClassData = useCallback(
    async (classId: string) => {
      if (!accessToken) return;
      const [roster, attendanceSessions] = await Promise.all([
        fetchAttendanceRoster(classId, accessToken),
        fetchAttendanceSessions(classId, accessToken),
      ]);
      const recordPairs = await Promise.all(
        attendanceSessions.map(
          async (session) => [session.id, await fetchAttendanceRecords(session.id, accessToken)] as const,
        ),
      );
      setStudents(roster);
      setSessions(attendanceSessions);
      setRecords(Object.fromEntries(recordPairs));
      setSelectedSessionId(null);
    },
    [accessToken],
  );

  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const list = await fetchTeacherClasses(accessToken);
        const targetId = list.some((item) => item.id === selectedId) ? selectedId : list[0]?.id ?? null;
        setClasses(list);
        if (targetId !== selectedId) setSelectedId(targetId);
        if (targetId) await loadClassData(targetId);
        else {
          setStudents([]);
          setSessions([]);
          setRecords({});
        }
      } catch (error) {
        console.error('[Teacher roster] load failed', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, loadClassData, selectedId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (course: TeacherClass) => {
    if (!accessToken || course.id === selectedId) return;
    haptics.selection();
    setSelectedId(course.id);
    try {
      await loadClassData(course.id);
    } catch (error) {
      console.error('[Teacher roster] class load failed', error);
    }
  };

  const sessionRecords = (sessionId: string) => records[sessionId] ?? [];
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const selectedRecords = selectedSession ? sessionRecords(selectedSession.id) : [];

  const totalCheckins = Object.values(records).reduce(
    (sum, entries) => sum + entries.filter((record) => record.status !== 'absent').length,
    0,
  );
  const possibleCheckins = students.length * sessions.length;
  const attendanceRate = possibleCheckins ? Math.round((totalCheckins / possibleCheckins) * 100) : 0;

  const openPdf = (url: string) => void Linking.openURL(url.startsWith('/') ? `${API_URL}${url}` : url);

  const removeSession = (session: AttendanceSessionSummary) => {
    if (!accessToken) return;
    Alert.alert(
      'Delete attendance?',
      'This permanently removes this closed session and its student check-ins.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteAttendanceSession(session.id, accessToken)
              .then(() => load(true))
              .catch((error: Error) => Alert.alert('Could not delete attendance', error.message));
          },
        },
      ],
    );
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomOffset }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <AppText variant="display" weight="extrabold">
              Class Roster
            </AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
              Student directories, check-in records & session archives
            </AppText>
          </View>
        </View>

        {/* Course Class Selector Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        >
          {classes.map((item) => {
            const active = selectedId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => void choose(item)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: active ? colors.brand : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.brand : colors.border,
                }}
              >
                <AppText
                  variant="caption"
                  weight="bold"
                  style={{ color: active ? '#FFFFFF' : colors.text }}
                >
                  {item.course_code} · Sec {item.section || '1'}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.brand} size="large" />
            <AppText variant="caption" tone="muted" style={{ marginTop: 12 }}>
              Loading class roster…
            </AppText>
          </View>
        ) : !selected ? (
          <EmptyState
            icon="people-outline"
            title="No class selected"
            message="Your assigned course roster will appear here."
          />
        ) : (
          <>
            {/* Class Stats Summary Card */}
            <View
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: '#1E143E',
                marginBottom: 20,
                position: 'relative',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                elevation: 4,
                shadowColor: '#43299F',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
              }}
            >
              <LinearGradient
                colors={['#1D1242', '#351B78', '#5B3FD1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <AppText variant="overline" weight="extrabold" style={{ color: '#D1C6FF', letterSpacing: 1.2 }}>
                      CLASS OVERVIEW
                    </AppText>
                    <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', marginTop: 2 }}>
                      {selected.course_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#DDD5FF', marginTop: 2 }}>
                      {selected.course_code} · Section {selected.section}
                    </AppText>
                  </View>

                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="people" size={24} color="#FFFFFF" />
                  </View>
                </View>

                {/* Metrics Row */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      padding: 12,
                      borderRadius: 16,
                    }}
                  >
                    <AppText variant="caption" style={{ color: '#D1C6FF' }}>
                      Enrolled
                    </AppText>
                    <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', marginTop: 2 }}>
                      {students.length}
                    </AppText>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      padding: 12,
                      borderRadius: 16,
                    }}
                  >
                    <AppText variant="caption" style={{ color: '#D1C6FF' }}>
                      Sessions
                    </AppText>
                    <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', marginTop: 2 }}>
                      {sessions.length}
                    </AppText>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      padding: 12,
                      borderRadius: 16,
                    }}
                  >
                    <AppText variant="caption" style={{ color: '#D1C6FF' }}>
                      Presence Rate
                    </AppText>
                    <AppText variant="heading" weight="extrabold" style={{ color: '#34D399', marginTop: 2 }}>
                      {attendanceRate}%
                    </AppText>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Enrolled Students Section */}
            <View style={{ marginBottom: 24 }}>
              <AppText variant="subheading" weight="bold" style={{ marginBottom: 12 }}>
                Enrolled Students ({students.length})
              </AppText>

              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                }}
              >
                {students.length === 0 ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <AppText variant="caption" tone="muted">
                      No enrolled students found for this class.
                    </AppText>
                  </View>
                ) : (
                  students.map((student, idx) => {
                    const studentRecords = Object.values(records).map((items) =>
                      items.find((item) => item.membership_id === student.membership_id),
                    );
                    const present = studentRecords.filter(
                      (item) => item?.status === 'present' || item?.status === 'suspicious',
                    ).length;
                    const isLast = idx === students.length - 1;

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
                            {student.full_name
                              .split(' ')
                              .map((name) => name[0])
                              .slice(0, 2)
                              .join('')}
                          </AppText>
                        </View>

                        <View style={{ flex: 1 }}>
                          <AppText variant="label" weight="semibold">
                            {student.full_name}
                          </AppText>
                          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                            {sessions.length > 0
                              ? `${present}/${sessions.length} sessions attended (${Math.round(
                                  (present / sessions.length) * 100,
                                )}%)`
                              : 'No sessions held yet'}
                          </AppText>
                        </View>

                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 10,
                            backgroundColor:
                              sessions.length > 0 && present === sessions.length
                                ? colors.successSoft
                                : colors.surfaceMuted,
                          }}
                        >
                          <AppText
                            variant="caption"
                            weight="bold"
                            style={{
                              color:
                                sessions.length > 0 && present === sessions.length
                                  ? colors.success
                                  : colors.textMuted,
                            }}
                          >
                            {sessions.length > 0 ? `${present}/${sessions.length}` : '—'}
                          </AppText>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* Past Attendance Sessions Section */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                  <AppText variant="subheading" weight="bold">
                    Past Attendance Sessions
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                    Session archives, check-in totals & reports
                  </AppText>
                </View>
                <Ionicons name="time-outline" size={20} color={colors.brand} />
              </View>

              {sessions.length ? (
                sessions.map((session) => {
                  const sessionRecordsList = sessionRecords(session.id);
                  const present = sessionRecordsList.filter((record) => record.status === 'present').length;
                  const absent = sessionRecordsList.filter((record) => record.status === 'absent').length;

                  return (
                    <View
                      key={session.id}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: colors.border,
                        marginBottom: 14,
                        overflow: 'hidden',
                        elevation: 2,
                        shadowColor: '#1B1730',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => setSelectedSessionId(session.id)}
                        style={{ padding: 18 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 14,
                              backgroundColor: colors.brandSoft,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="calendar-outline" size={22} color={colors.brand} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <AppText variant="label" weight="extrabold">
                              {new Date(session.session_date).toLocaleDateString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </AppText>
                            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                              {new Date(session.session_date).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}{' '}
                              · {session.period || 'Attendance session'} · Status: {session.status}
                            </AppText>
                          </View>

                          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                        </View>

                        {/* Counts Pill Bar */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                          <View
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              backgroundColor: colors.successSoft,
                              paddingVertical: 8,
                              alignItems: 'center',
                            }}
                          >
                            <AppText variant="caption" weight="bold" style={{ color: colors.success }}>
                              {present} Present
                            </AppText>
                          </View>
                          <View
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              backgroundColor: colors.dangerSoft,
                              paddingVertical: 8,
                              alignItems: 'center',
                            }}
                          >
                            <AppText variant="caption" weight="bold" style={{ color: colors.danger }}>
                              {absent} Absent
                            </AppText>
                          </View>
                          <View
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              backgroundColor: colors.surfaceMuted,
                              paddingVertical: 8,
                              alignItems: 'center',
                            }}
                          >
                            <AppText variant="caption" weight="bold" tone="muted">
                              {sessionRecordsList.length} Total
                            </AppText>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {session.pdf_url ? (
                        <TouchableOpacity
                          onPress={() => openPdf(session.pdf_url!)}
                          style={{
                            marginHorizontal: 16,
                            marginBottom: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 14,
                            backgroundColor: colors.brandSoft,
                            paddingVertical: 12,
                            gap: 8,
                          }}
                        >
                          <Ionicons name="download-outline" size={18} color={colors.brand} />
                          <AppText variant="caption" weight="bold" tone="brand">
                            Download PDF Report
                          </AppText>
                        </TouchableOpacity>
                      ) : null}

                      {session.status === 'closed' && hasPermission('manage_session') ? (
                        <TouchableOpacity
                          onPress={() => removeSession(session)}
                          style={{
                            marginHorizontal: 16,
                            marginBottom: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 14,
                            backgroundColor: colors.dangerSoft,
                            paddingVertical: 10,
                            gap: 8,
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          <AppText variant="caption" weight="bold" style={{ color: colors.danger }}>
                            Delete Attendance Session
                          </AppText>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 20,
                    alignItems: 'center',
                  }}
                >
                  <AppText variant="caption" tone="muted">
                    No past attendance sessions recorded for this class.
                  </AppText>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Attendance Session Details Modal */}
      <Modal visible={!!selectedSession} animationType="slide" onRequestClose={() => setSelectedSessionId(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient
            colors={['#1D1242', '#351B78', '#5B3FD1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: 54,
              paddingBottom: 24,
              paddingHorizontal: 20,
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => setSelectedSessionId(null)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <AppText variant="overline" weight="extrabold" style={{ color: '#D1C6FF', letterSpacing: 1.2 }}>
                ATTENDANCE REPORT
              </AppText>
              <View style={{ width: 40 }} />
            </View>

            {selectedSession ? (
              <View style={{ marginTop: 18 }}>
                <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 22 }}>
                  {new Date(selectedSession.session_date).toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </AppText>
                <AppText variant="caption" style={{ color: '#DDD5FF', marginTop: 4 }}>
                  {selectedSession.period || 'Attendance session'} · Status: {selectedSession.status}
                </AppText>
              </View>
            ) : null}
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            {/* Stat Badges */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: colors.successSoft,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <AppText variant="caption" weight="bold" style={{ color: colors.success }}>
                  PRESENT
                </AppText>
                <AppText variant="heading" weight="extrabold" style={{ color: colors.success, marginTop: 4 }}>
                  {selectedRecords.filter((record) => record.status === 'present').length}
                </AppText>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: colors.dangerSoft,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <AppText variant="caption" weight="bold" style={{ color: colors.danger }}>
                  ABSENT
                </AppText>
                <AppText variant="heading" weight="extrabold" style={{ color: colors.danger, marginTop: 4 }}>
                  {selectedRecords.filter((record) => record.status === 'absent').length}
                </AppText>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: colors.warningSoft,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <AppText variant="caption" weight="bold" style={{ color: colors.warning }}>
                  FLAGGED
                </AppText>
                <AppText variant="heading" weight="extrabold" style={{ color: colors.warning, marginTop: 4 }}>
                  {selectedRecords.filter((record) => record.status === 'suspicious').length}
                </AppText>
              </View>
            </View>

            {/* PDF Report Button */}
            {selectedSession?.pdf_url ? (
              <TouchableOpacity
                onPress={() => openPdf(selectedSession.pdf_url!)}
                style={{
                  borderRadius: 18,
                  backgroundColor: colors.brand,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  gap: 8,
                }}
              >
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <AppText variant="label" weight="bold" style={{ color: '#FFFFFF' }}>
                  Download PDF Report
                </AppText>
              </TouchableOpacity>
            ) : null}

            {/* Student Check-ins List */}
            <AppText variant="subheading" weight="bold" style={{ marginBottom: 12 }}>
              Student Check-in Verification
            </AppText>

            <View style={{ gap: 8 }}>
              {selectedRecords.map((record) => (
                <View
                  key={record.membership_id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surface,
                    borderRadius: 18,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor:
                        record.status === 'present'
                          ? colors.successSoft
                          : record.status === 'suspicious'
                          ? colors.warningSoft
                          : colors.dangerSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={
                        record.status === 'present'
                          ? 'checkmark'
                          : record.status === 'suspicious'
                          ? 'warning-outline'
                          : 'close'
                      }
                      size={18}
                      color={
                        record.status === 'present'
                          ? colors.success
                          : record.status === 'suspicious'
                          ? colors.warning
                          : colors.danger
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <AppText variant="label" weight="semibold">
                      {record.student}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                      {record.status}
                      {record.checkin_time
                        ? ` · ${new Date(record.checkin_time).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`
                        : ''}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
