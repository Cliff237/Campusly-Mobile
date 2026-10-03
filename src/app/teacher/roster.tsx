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
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/ui/AppText";
import { EmptyState } from "@/ui/EmptyState";
import { Sheet } from "@/ui/Sheet";
import { useAppTheme } from "@/ui/useAppTheme";
import { useModalPresence } from "@/ui/modalStore";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { haptics } from "@/lib/haptics";
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
  const { colors, shadow, isDark } = useAppTheme();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [students, setStudents] = useState<AttendanceRosterStudent[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionSummary[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecordSummary[]>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  useModalPresence(selectedSessionId != null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Dropdown class picker + collapsible session history keep the page short.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
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
  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, 3);
  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.brand}
          />
        }
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <AppText variant="display">Roster</AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
              Students enrolled in your classes.
            </AppText>
          </View>
          {hasPermission("manage_roster") ? (
            <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }}>
              <AppText variant="caption" weight="bold" color={colors.brand} style={{ fontSize: 11.5, lineHeight: 14 }}>
                Manage roster
              </AppText>
            </View>
          ) : null}
        </View>

        {/* ── Class dropdown (replaces the horizontal chip strip) ── */}
        {classes.length > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Selected class ${selected?.course_name ?? ""}. Tap to change class.`}
            onPress={() => { haptics.light(); setPickerOpen(true); }}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, marginTop: 18, boxShadow: shadow.sm }}
          >
            <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="people" size={19} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText weight="bold" numberOfLines={1}>{selected?.course_name ?? "Select a class"}</AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {selected ? `${selected.course_code} · Section ${selected.section}` : "Tap to browse your classes"}
              </AppText>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ paddingTop: 70 }} />
        ) : !selected ? (
          <EmptyState icon="people-outline" title="No class selected" message="Your class roster will appear here." />
        ) : (
          <>
            {/* ── Class overview ── */}
            <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 16, marginBottom: 20, borderRadius: 26, overflow: "hidden", boxShadow: shadow.md }}>
            <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <AppText variant="caption" color="#CFC5FF" style={{ letterSpacing: 1 }}>CLASS OVERVIEW</AppText>
                  <AppText variant="heading" color="#FFFFFF" style={{ marginTop: 4 }}>{selected.course_code} · {selected.section}</AppText>
                </View>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="people" size={22} color="#FDE68A" />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <StatTile label="Students" value={String(students.length)} tint="#FFFFFF" />
                <StatTile label="Sessions" value={String(sessions.length)} tint="#FFFFFF" />
                <StatTile label="Rate" value={`${attendanceRate}%`} tint="#FDE68A" />
              </View>
            </LinearGradient>
            </Animated.View>

            {/* ── Enrolled students ── */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <AppText variant="subheading">Enrolled students</AppText>
              <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <AppText variant="caption" weight="bold" color={colors.brand} style={{ fontSize: 11.5, lineHeight: 14 }}>{students.length}</AppText>
              </View>
            </View>
            {students.map((student, index) => (
              <Animated.View key={student.membership_id} entering={FadeInDown.duration(260).delay(Math.min(index, 6) * 35)}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 }}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                    <AppText variant="caption" weight="bold" color={colors.brand}>
                      {student.full_name
                        .split(" ")
                        .map((name) => name[0])
                        .slice(0, 2)
                        .join("")}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="label" weight="bold">{student.full_name}</AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                      {(() => { const studentRecords = Object.values(records).map((items) => items.find((item) => item.membership_id === student.membership_id)); const present = studentRecords.filter((item) => item?.status === "present" || item?.status === "suspicious").length; return `${present}/${sessions.length} attended`; })()}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </Animated.View>
            ))}
            {hasPermission("manage_roster") ? (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: isDark ? colors.surfaceMuted : "#FEF6E7", borderRadius: 16, padding: 14, marginTop: 6, borderWidth: 1, borderColor: isDark ? colors.border : "#F5E3BE" }}>
                <Ionicons name="information-circle-outline" size={17} color={colors.warning} style={{ marginTop: 1 }} />
                <AppText variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
                  Enrollment and removal controls will activate when the
                  roster-management endpoints are available.
                </AppText>
              </View>
            ) : null}

            {/* ── Past attendance ── */}
            <View style={{ marginTop: 26 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <AppText variant="subheading">Past attendance</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    Session totals and student check-in details
                  </AppText>
                </View>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="time-outline" size={18} color={colors.brand} />
                </View>
              </View>
              {sessions.length ? (
                <>
                  {visibleSessions.map((session) => {
                    const sessionRecordsList = sessionRecords(session.id);
                    const present = sessionRecordsList.filter((record) => record.status === "present").length;
                    const absent = sessionRecordsList.filter((record) => record.status === "absent").length;
                    return (
                      <View key={session.id} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, marginBottom: 10, overflow: "hidden", boxShadow: shadow.sm }}>
                        <TouchableOpacity onPress={() => setSelectedSessionId(session.id)} style={{ padding: 14, flexDirection: "row", alignItems: "center" }}>
                          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="calendar-outline" size={18} color={colors.brand} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <AppText variant="label" weight="bold">
                              {new Date(session.session_date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                            </AppText>
                            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                              {new Date(session.session_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {session.period || "Attendance session"}
                            </AppText>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 6 }}>
                            <View style={{ backgroundColor: session.status === "closed" ? (isDark ? colors.surfaceMuted : "#EEF2F6") : (isDark ? colors.surfaceMuted : "#E4F7EE"), paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                              <AppText variant="caption" weight="bold" color={session.status === "closed" ? colors.textMuted : colors.success} style={{ fontSize: 10.5, lineHeight: 13, textTransform: "uppercase" }}>{session.status}</AppText>
                            </View>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <AppText variant="caption" weight="bold" color={colors.success} style={{ fontSize: 11.5, lineHeight: 14 }}>✓ {present}</AppText>
                              <AppText variant="caption" weight="bold" color={colors.danger} style={{ fontSize: 11.5, lineHeight: 14 }}>✕ {absent}</AppText>
                            </View>
                          </View>
                          <Ionicons name="expand-outline" size={17} color={colors.textMuted} style={{ marginLeft: 10 }} />
                        </TouchableOpacity>
                        {session.pdf_url || (session.status === "closed" && hasPermission("manage_session")) ? (
                          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                            {session.pdf_url ? (
                              <TouchableOpacity onPress={() => openPdf(session.pdf_url!)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, borderRadius: 12, paddingVertical: 9 }}>
                                <Ionicons name="download-outline" size={15} color={colors.brand} />
                                <AppText variant="caption" weight="bold" color={colors.brand}>PDF report</AppText>
                              </TouchableOpacity>
                            ) : null}
                            {session.status === "closed" && hasPermission("manage_session") ? (
                              <TouchableOpacity onPress={() => removeSession(session)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: isDark ? colors.surfaceMuted : colors.dangerSoft, borderRadius: 12, paddingVertical: 9 }}>
                                <Ionicons name="trash-outline" size={15} color={colors.danger} />
                                <AppText variant="caption" weight="bold" color={colors.danger}>Delete</AppText>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  {sessions.length > 3 ? (
                    <TouchableOpacity onPress={() => setShowAllSessions((value) => !value)} style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, marginTop: 2 }}>
                      <AppText variant="caption" weight="bold" color={colors.brand}>
                        {showAllSessions ? "Show fewer sessions" : `Show all ${sessions.length} sessions`}
                      </AppText>
                      <Ionicons name={showAllSessions ? "chevron-up" : "chevron-down"} size={14} color={colors.brand} />
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18 }}>
                  <AppText variant="caption" tone="muted">No past attendance sessions for this class.</AppText>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Class picker sheet ── */}
      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Select a class" scroll>
        {classes.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => { setPickerOpen(false); void choose(item); }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 14, borderRadius: 16, marginBottom: 8, backgroundColor: isSelected ? (isDark ? colors.surfaceMuted : colors.brandSoft) : colors.background, borderWidth: 1, borderColor: isSelected ? colors.brand : colors.border }}
            >
              <View style={{ flex: 1 }}>
                <AppText weight={isSelected ? "bold" : "semibold"} numberOfLines={1}>{item.course_name}</AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>{item.course_code} · {item.section} · {item.enrolled_count} students</AppText>
              </View>
              {isSelected ? <Ionicons name="checkmark-circle" size={20} color={colors.brand} /> : <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />}
            </TouchableOpacity>
          );
        })}
      </Sheet>

      {/* ── Session report ── */}
      <Modal visible={!!selectedSession} animationType="slide" onRequestClose={() => setSelectedSessionId(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <TouchableOpacity onPress={() => setSelectedSessionId(null)} accessibilityRole="button" accessibilityLabel="Close report" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <AppText variant="caption" color="#CFC5FF" style={{ letterSpacing: 1.2 }}>ATTENDANCE REPORT</AppText>
              <View style={{ width: 40 }} />
            </View>
            {selectedSession ? <><AppText variant="display" color="#FFFFFF" style={{ marginTop: 18 }}>{new Date(selectedSession.session_date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</AppText><AppText variant="caption" color="#CFC5FF" style={{ marginTop: 4 }}>{selectedSession.period || "Attendance session"} · {selectedSession.status}</AppText></> : null}
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
              <ReportStat label="PRESENT" value={selectedRecords.filter((record) => record.status === "present").length} tint={colors.success} />
              <ReportStat label="ABSENT" value={selectedRecords.filter((record) => record.status === "absent").length} tint={colors.danger} />
              <ReportStat label="FLAGGED" value={selectedRecords.filter((record) => record.status === "suspicious").length} tint={colors.warning} />
            </View>
            {selectedSession?.pdf_url ? <TouchableOpacity onPress={() => openPdf(selectedSession.pdf_url!)} style={{ borderRadius: 18, backgroundColor: colors.brand, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, boxShadow: shadow.md }}><Ionicons name="download-outline" size={19} color="#fff" /><AppText weight="bold" color="#FFFFFF">Download PDF report</AppText></TouchableOpacity> : null}
            <AppText variant="subheading" style={{ marginBottom: 12 }}>Student check-ins</AppText>
            {selectedRecords.map((record) => {
              const tint = record.status === "present" ? colors.success : record.status === "suspicious" ? colors.warning : colors.danger;
              const soft = record.status === "present" ? (isDark ? colors.surfaceMuted : "#E4F7EE") : record.status === "suspicious" ? (isDark ? colors.surfaceMuted : "#FEF6E7") : (isDark ? colors.surfaceMuted : colors.dangerSoft);
              return (
                <View key={record.membership_id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: soft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={record.status === "present" ? "checkmark" : record.status === "suspicious" ? "warning-outline" : "close"} size={17} color={tint} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="label" weight="bold">{record.student}</AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                      <AppText variant="caption" weight="bold" color={tint} style={{ fontSize: 11.5, lineHeight: 15 }}>{record.status.toUpperCase()}</AppText>
                      {record.checkin_time ? ` · ${new Date(record.checkin_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function StatTile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", padding: 12 }}>
      <AppText variant="caption" color="#CFC5FF" style={{ fontSize: 11, lineHeight: 14 }}>{label}</AppText>
      <AppText variant="heading" color={tint} style={{ marginTop: 4 }}>{value}</AppText>
    </View>
  );
}

function ReportStat({ label, value, tint }: { label: string; value: number; tint: string }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={{ flex: 1, borderRadius: 18, backgroundColor: isDark ? colors.surfaceMuted : `${tint}14`, borderWidth: 1, borderColor: isDark ? colors.border : `${tint}33`, padding: 14 }}>
      <AppText variant="caption" weight="bold" color={tint} style={{ fontSize: 10.5, lineHeight: 13, letterSpacing: 0.8 }}>{label}</AppText>
      <AppText variant="display" color={tint} style={{ marginTop: 4, fontSize: 30, lineHeight: 34 }}>{value}</AppText>
    </View>
  );
}
