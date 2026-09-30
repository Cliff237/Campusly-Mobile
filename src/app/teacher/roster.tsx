import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/ui/ThemedText";
import { EmptyStateAnimation } from "@/ui/EmptyStateAnimation";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { API_URL } from "@/lib/config";
import { fetchTeacherClasses } from "@/lib/api/teacherMarks";
import {
  fetchAttendanceRecords,
  fetchAttendanceRoster,
  fetchAttendanceSessions,
  deleteAttendanceSession,
  type AttendanceRecordSummary,
} from "@/lib/api/attendance";
import type { TeacherClass } from "@/lib/types/teacherMarks";
import type {
  AttendanceRosterStudent,
  AttendanceSessionSummary,
} from "@/lib/types/attendance";

export default function TeacherRosterScreen() {
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
  const loadClassData = useCallback(async (classId: string) => {
    if (!accessToken) return;
    const [roster, attendanceSessions] = await Promise.all([
      fetchAttendanceRoster(classId, accessToken),
      fetchAttendanceSessions(classId, accessToken),
    ]);
    const recordPairs = await Promise.all(
      attendanceSessions.map(async (session) => [
        session.id,
        await fetchAttendanceRecords(session.id, accessToken),
      ] as const),
    );
    setStudents(roster);
    setSessions(attendanceSessions);
    setRecords(Object.fromEntries(recordPairs));
    setSelectedSessionId(null);
  }, [accessToken]);
  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken) return;
      refresh ? setRefreshing(true) : setLoading(true);
      try {
        const list = await fetchTeacherClasses(accessToken);
        const targetId = list.some((item) => item.id === selectedId)
          ? selectedId
          : (list[0]?.id ?? null);
        setClasses(list);
        if (targetId !== selectedId) setSelectedId(targetId);
        if (targetId) await loadClassData(targetId);
        else {
          setStudents([]);
          setSessions([]);
          setRecords({});
        }
        console.log("[Teacher roster] loaded once", {
          classId: targetId,
          studentCount: targetId ? "loaded" : 0,
        });
      } catch (error) {
        console.error("[Teacher roster] load failed", error);
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
    setSelectedId(course.id);
    try {
      await loadClassData(course.id);
      console.log("[Teacher roster] switched class", { classId: course.id });
    } catch (error) {
      console.error("[Teacher roster] class load failed", error);
    }
  };
  const sessionRecords = (sessionId: string) => records[sessionId] ?? [];
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const selectedRecords = selectedSession ? sessionRecords(selectedSession.id) : [];
  const totalCheckins = Object.values(records).reduce((sum, entries) => sum + entries.filter((record) => record.status !== "absent").length, 0);
  const possibleCheckins = students.length * sessions.length;
  const attendanceRate = possibleCheckins ? Math.round((totalCheckins / possibleCheckins) * 100) : 0;
  const openPdf = (url: string) => void Linking.openURL(url.startsWith("/") ? `${API_URL}${url}` : url);
  const removeSession = (session: AttendanceSessionSummary) => {
    if (!accessToken) return;
    Alert.alert("Delete attendance?", "This permanently removes this closed session and its student check-ins.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { void deleteAttendanceSession(session.id, accessToken).then(() => load(true)).catch((error: Error) => Alert.alert("Could not delete attendance", error.message)); } },
    ]);
  };
  return (
    <>
      <ScrollView
      className="flex-1 bg-bg dark:bg-bg-dark"
      contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor="#5b3fd1"
        />
      }
    >
      <View className="flex-row items-center justify-between">
        <View>
          <ThemedText variant="display">Roster</ThemedText>
          <ThemedText
            variant="caption"
            className="text-text-muted dark:text-text-muted-dark mt-1"
          >
            Students enrolled in your classes.
          </ThemedText>
        </View>
        {hasPermission("manage_roster") ? (
          <View className="rounded-xl bg-primary-soft px-3 py-2">
            <ThemedText variant="tiny" className="text-primary font-semibold">
              Manage roster
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-6 mb-5"
      >
        <View className="flex-row gap-2">
          {classes.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => void choose(item)}
              className={`rounded-xl px-4 py-3 ${selectedId === item.id ? "bg-primary" : "bg-surface dark:bg-surface-dark border border-border dark:border-border-dark"}`}
            >
              <ThemedText
                variant="caption"
                className={selectedId === item.id ? "text-white font-bold" : ""}
              >
                {item.course_code} · {item.section}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {loading ? (
        <ActivityIndicator color="#5b3fd1" className="py-20" />
      ) : !selected ? (
        <EmptyStateAnimation
          icon="people-outline"
          title="No class selected"
          subtitle="Your class roster will appear here."
        />
      ) : (
        <>
          <View className="rounded-3xl bg-ink p-5 mb-5">
            <View className="flex-row items-center justify-between">
              <View><ThemedText variant="tiny" className="text-white/70">CLASS OVERVIEW</ThemedText><ThemedText variant="heading" className="text-white mt-1">{selected.course_code} · {selected.section}</ThemedText></View>
              <Ionicons name="people" size={28} color="#fbbf24" />
            </View>
            <View className="flex-row gap-2 mt-5">
              <View className="flex-1 rounded-2xl bg-white/10 p-3"><ThemedText variant="tiny" className="text-white/70">Students</ThemedText><ThemedText variant="heading" className="text-white mt-1">{students.length}</ThemedText></View>
              <View className="flex-1 rounded-2xl bg-white/10 p-3"><ThemedText variant="tiny" className="text-white/70">Sessions</ThemedText><ThemedText variant="heading" className="text-white mt-1">{sessions.length}</ThemedText></View>
              <View className="flex-1 rounded-2xl bg-white/10 p-3"><ThemedText variant="tiny" className="text-white/70">Rate</ThemedText><ThemedText variant="heading" className="text-sun mt-1">{attendanceRate}%</ThemedText></View>
            </View>
          </View>
          <ThemedText variant="subheading" className="mb-3">Enrolled students</ThemedText>
          {students.map((student) => (
            <View
              key={student.membership_id}
              className="flex-row items-center rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-4 py-3 mb-2"
            >
              <View className="w-10 h-10 rounded-full bg-primary-soft items-center justify-center">
                <ThemedText
                  variant="caption"
                  className="text-primary font-bold"
                >
                  {student.full_name
                    .split(" ")
                    .map((name) => name[0])
                    .slice(0, 2)
                    .join("")}
                </ThemedText>
              </View>
              <View className="flex-1 ml-3">
                <ThemedText variant="caption" className="font-semibold">
                  {student.full_name}
                </ThemedText>
                <ThemedText
                  variant="tiny"
                  className="text-text-muted dark:text-text-muted-dark"
                >
                  {(() => { const studentRecords = Object.values(records).map((items) => items.find((item) => item.membership_id === student.membership_id)); const present = studentRecords.filter((item) => item?.status === "present" || item?.status === "suspicious").length; return `${present}/${sessions.length} attended`; })()}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9892aa" />
            </View>
          ))}
          {hasPermission("manage_roster") ? (
            <View className="rounded-2xl bg-sun-soft p-4 mt-3">
              <ThemedText variant="tiny" className="text-text">
                Enrollment and removal controls will activate when the
                roster-management endpoints are available.
              </ThemedText>
            </View>
          ) : null}
          <View className="mt-8">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <ThemedText variant="subheading">Past attendance</ThemedText>
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">
                  Session totals and student check-in details
                </ThemedText>
              </View>
              <Ionicons name="time-outline" size={21} color="#6d28d9" />
            </View>
            {sessions.length ? sessions.map((session) => {
              const sessionRecordsList = sessionRecords(session.id);
              const present = sessionRecordsList.filter((record) => record.status === "present").length;
              const absent = sessionRecordsList.filter((record) => record.status === "absent").length;
              return (
                <View key={session.id} className="rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark mb-3 overflow-hidden">
                  <TouchableOpacity onPress={() => setSelectedSessionId(session.id)} className="p-4">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-2xl bg-primary-soft items-center justify-center">
                        <Ionicons name="calendar-outline" size={20} color="#6d28d9" />
                      </View>
                      <View className="flex-1 ml-3">
                        <ThemedText variant="caption" className="font-bold">
                          {new Date(session.session_date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </ThemedText>
                        <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">
                          {new Date(session.session_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {session.period || "Attendance session"} · {session.status}
                        </ThemedText>
                      </View>
                      <Ionicons name="expand-outline" size={20} color="#706b82" />
                    </View>
                    <View className="flex-row gap-2 mt-4">
                      <View className="flex-1 rounded-xl bg-success-soft px-3 py-2"><ThemedText variant="tiny" className="text-success font-semibold">Present</ThemedText><ThemedText variant="heading" className="text-success mt-1">{present}</ThemedText></View>
                      <View className="flex-1 rounded-xl bg-danger-soft px-3 py-2"><ThemedText variant="tiny" className="text-danger font-semibold">Absent</ThemedText><ThemedText variant="heading" className="text-danger mt-1">{absent}</ThemedText></View>
                      <View className="flex-1 rounded-xl bg-sun-soft px-3 py-2"><ThemedText variant="tiny" className="text-sun font-semibold">Total</ThemedText><ThemedText variant="heading" className="text-sun mt-1">{sessionRecordsList.length}</ThemedText></View>
                    </View>
                  </TouchableOpacity>
                  {session.pdf_url ? <TouchableOpacity onPress={() => openPdf(session.pdf_url!)} className="mx-4 mb-4 flex-row items-center justify-center rounded-xl bg-primary-soft px-3 py-3"><Ionicons name="download-outline" size={18} color="#5b3fd1" /><ThemedText variant="caption" className="text-primary font-semibold ml-2">Download PDF report</ThemedText></TouchableOpacity> : null}
                  {session.status === "closed" && hasPermission("manage_session") ? <TouchableOpacity onPress={() => removeSession(session)} className="mx-4 mb-4 flex-row items-center justify-center rounded-xl bg-danger-soft px-3 py-3"><Ionicons name="trash-outline" size={18} color="#c2415f" /><ThemedText variant="caption" className="text-danger font-semibold ml-2">Delete attendance</ThemedText></TouchableOpacity> : null}
                </View>
              );
            }) : <View className="rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-5"><ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">No past attendance sessions for this class.</ThemedText></View>}
          </View>
        </>
      )}
      </ScrollView>
      <Modal visible={!!selectedSession} animationType="slide" onRequestClose={() => setSelectedSessionId(null)}>
      <View className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="bg-ink px-5 pt-14 pb-6 rounded-b-[32px]">
          <View className="flex-row items-center justify-between"><TouchableOpacity onPress={() => setSelectedSessionId(null)} className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center"><Ionicons name="close" size={22} color="#fff" /></TouchableOpacity><ThemedText variant="tiny" className="text-white/70">ATTENDANCE REPORT</ThemedText><View className="w-10" /></View>
          {selectedSession ? <><ThemedText variant="display" className="text-white mt-6">{new Date(selectedSession.session_date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</ThemedText><ThemedText variant="caption" className="text-white/70 mt-1">{selectedSession.period || "Attendance session"} · {selectedSession.status}</ThemedText></> : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View className="flex-row gap-3 mb-5"><View className="flex-1 rounded-2xl bg-success-soft p-4"><ThemedText variant="tiny" className="text-success">PRESENT</ThemedText><ThemedText variant="display" className="text-success mt-1">{selectedRecords.filter((record) => record.status === "present").length}</ThemedText></View><View className="flex-1 rounded-2xl bg-danger-soft p-4"><ThemedText variant="tiny" className="text-danger">ABSENT</ThemedText><ThemedText variant="display" className="text-danger mt-1">{selectedRecords.filter((record) => record.status === "absent").length}</ThemedText></View><View className="flex-1 rounded-2xl bg-sun-soft p-4"><ThemedText variant="tiny" className="text-sun">FLAGGED</ThemedText><ThemedText variant="display" className="text-sun mt-1">{selectedRecords.filter((record) => record.status === "suspicious").length}</ThemedText></View></View>
          {selectedSession?.pdf_url ? <TouchableOpacity onPress={() => openPdf(selectedSession.pdf_url!)} className="rounded-2xl bg-primary px-4 py-4 flex-row items-center justify-center mb-5"><Ionicons name="download-outline" size={20} color="#fff" /><ThemedText variant="body" className="text-white font-bold ml-2">Download PDF report</ThemedText></TouchableOpacity> : null}
          <ThemedText variant="subheading" className="mb-3">Student check-ins</ThemedText>
          {selectedRecords.map((record) => <View key={record.membership_id} className="flex-row items-center rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-4 py-3 mb-2"><View className={`w-9 h-9 rounded-xl items-center justify-center ${record.status === "present" ? "bg-success-soft" : record.status === "suspicious" ? "bg-sun-soft" : "bg-danger-soft"}`}><Ionicons name={record.status === "present" ? "checkmark" : record.status === "suspicious" ? "warning-outline" : "close"} size={18} color={record.status === "present" ? "#25855f" : record.status === "suspicious" ? "#d97706" : "#c2415f"} /></View><View className="flex-1 ml-3"><ThemedText variant="caption" className="font-semibold">{record.student}</ThemedText><ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">{record.status}{record.checkin_time ? ` · ${new Date(record.checkin_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</ThemedText></View></View>)}
        </ScrollView>
      </View>
      </Modal>
    </>
  );
}
