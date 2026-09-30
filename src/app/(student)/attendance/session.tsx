import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { ThemedText } from "@/ui/ThemedText";
import { showToast } from "@/ui/Toast";
import { haptics } from "@/lib/haptics";
import {
  closeAttendanceSession,
  fetchAttendanceRoster,
  manualMarkAttendance,
} from "@/lib/api/attendance";
import { useAuth } from "@/lib/auth/AuthContext";
import type { AttendanceRosterStudent } from "@/lib/types/attendance";
import { useBLE } from "@/hooks/useBLE";

type Student = AttendanceRosterStudent & { changed?: boolean };
const SIZE = 220,
  DOTS = 56;

function ProgressRing({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const active = Math.ceil(Math.max(0, remaining / total) * DOTS);
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return (
    <View style={styles.ring}>
      {Array.from({ length: DOTS }, (_, i) => {
        const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2,
          color = i < 18 ? "#8b5cf6" : i < 40 ? "#39d7c5" : "#f58ac0";
        return (
          <MotiView
            key={i}
            animate={{
              opacity: i < active ? 1 : 0.12,
              scale: i < active ? 1 : 0.72,
            }}
            transition={{ type: "timing", duration: 420 }}
            style={{
              position: "absolute",
              width: 5,
              height: 5,
              borderRadius: 4,
              backgroundColor: color,
              left: SIZE / 2 + Math.cos(a) * 101 - 2,
              top: SIZE / 2 + Math.sin(a) * 101 - 2,
            }}
          />
        );
      })}
      <View style={styles.core}>
        <ThemedText
          variant="display"
          style={{ color: remaining < 60 ? "#f9c878" : "#fff", fontSize: 43 }}
        >
          {clock}
        </ThemedText>
        <ThemedText
          variant="tiny"
          style={{ color: "#b9b3ca", letterSpacing: 1 }}
        >
          TIME REMAINING
        </ThemedText>
      </View>
    </View>
  );
}

export default function LiveAttendanceScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { accessToken } = useAuth();
  const { stopBeacon } = useBLE();
  const p = useLocalSearchParams<{
    sessionId: string;
    classId: string;
    code: string;
    duration: string;
    courseId: string;
    courseName: string;
    manual: string;
  }>();
  const total = Math.max(1, Number(p.duration) || 10) * 60;
  const [remaining, setRemaining] = useState(total),
    [roster, setRoster] = useState<Student[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [closing, setClosing] = useState(false);
  const name = useMemo(() => {
    try {
      return decodeURIComponent(p.courseName || "Course");
    } catch {
      return p.courseName || "Course";
    }
  }, [p.courseName]);
  const load = useCallback(async () => {
    if (!accessToken || !p.classId) return;
    setLoading(true);
    try {
      console.log("[Attendance] Loading live roster", {
        sessionId: p.sessionId,
        classId: p.classId,
      });
      setRoster(await fetchAttendanceRoster(p.classId, accessToken));
    } catch (e) {
      console.error("[Attendance] Roster load failed", e);
      showToast.error(
        "Roster unavailable",
        e instanceof Error ? e.message : "Could not load class roster",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, p.classId, p.sessionId]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => () => { void stopBeacon(); }, [stopBeacon]);
  const present = roster.filter((s) => s.status === "present").length,
    shown = roster.filter((s) =>
      s.full_name.toLowerCase().includes(query.trim().toLowerCase()),
    );
  const mark = async (student: Student) => {
    if (!accessToken || p.manual !== "true") return;
    const status = student.status === "present" ? "absent" : "present";
    setRoster((all) =>
      all.map((s) =>
        s.membership_id === student.membership_id
          ? { ...s, status, changed: true }
          : s,
      ),
    );
    try {
      console.log("[Attendance] Manual mark", {
        sessionId: p.sessionId,
        studentId: student.membership_id,
        status,
      });
      await manualMarkAttendance(
        p.sessionId,
        student.membership_id,
        status,
        accessToken,
      );
      haptics.selection();
    } catch (e) {
      console.error("[Attendance] Manual mark failed", e);
      showToast.error(
        "Mark was not saved",
        e instanceof Error ? e.message : "Try again",
      );
      void load();
    }
  };
  const finish = async () => {
    if (!accessToken || !p.sessionId || closing) return;
    setClosing(true);
    try {
      try {
        await stopBeacon();
      } catch (error) {
        console.warn("[Attendance] Beacon cleanup failed", error);
      }
      const result = await closeAttendanceSession(p.sessionId, accessToken);
      haptics.success();
      showToast.success(
        "Attendance completed",
        `${result.total_present} present · ${result.total_absent} absent`,
      );
      const coursePath = segments[0] === "teacher"
        ? `/teacher/courses/${p.courseId}?name=${encodeURIComponent(name)}&classId=${p.classId}`
        : `/(student)/courses/${p.courseId}`;
      router.replace(coursePath as never);
    } catch (e) {
      console.error("[Attendance] Close failed", e);
      showToast.error(
        "Session is still live",
        e instanceof Error ? e.message : "Try again",
      );
    } finally {
      setClosing(false);
    }
  };
  useEffect(() => {
    const id = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (remaining === 0 && !closing) void finish();
  }, [remaining, closing]);
  return (
    <View style={styles.screen}>
      <MotiView
        from={{ translateX: -25, opacity: 0.2 }}
        animate={{ translateX: 30, opacity: 0.38 }}
        transition={{
          type: "timing",
          duration: 7000,
          loop: true,
          repeatReverse: true,
        }}
        style={[
          styles.blob,
          { backgroundColor: "#7147e8", top: -85, left: -75 },
        ]}
      />
      <MotiView
        from={{ translateY: -20, opacity: 0.12 }}
        animate={{ translateY: 20, opacity: 0.28 }}
        transition={{
          type: "timing",
          duration: 8200,
          loop: true,
          repeatReverse: true,
        }}
        style={[
          styles.blob,
          { backgroundColor: "#18bfb1", top: 160, right: -95 },
        ]}
      />
      <MotiView
        from={{ translateY: 25, opacity: 0.12 }}
        animate={{ translateY: -15, opacity: 0.25 }}
        transition={{
          type: "timing",
          duration: 9000,
          loop: true,
          repeatReverse: true,
        }}
        style={[
          styles.blob,
          { backgroundColor: "#e45d9d", bottom: -135, left: 70 },
        ]}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 42 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
              <MotiView
                from={{ opacity: 0.3, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "timing",
                  duration: 900,
                  loop: true,
                  repeatReverse: true,
                }}
                className="w-2 h-2 rounded-full bg-emerald-300 mr-2"
              />
              <ThemedText
                variant="tiny"
                style={{
                  color: "#cfc7e8",
                  fontWeight: "800",
                  letterSpacing: 1.3,
                }}
              >
                LIVE ATTENDANCE
              </ThemedText>
            </View>
            <ThemedText
              variant="subheading"
              style={{ color: "#fff", marginTop: 5 }}
            >
              {name}
            </ThemedText>
          </View>
          <TouchableOpacity
            disabled={closing}
            onPress={() =>
              Alert.alert(
                "End live attendance?",
                "Students not marked present will be absent when this closes.",
                [
                  { text: "Keep open", style: "cancel" },
                  {
                    text: "End session",
                    style: "destructive",
                    onPress: () => void finish(),
                  },
                ],
              )
            }
            style={styles.end}
          >
            <ThemedText
              variant="caption"
              style={{ color: "#fff", fontWeight: "700" }}
            >
              {closing ? "Ending…" : "End"}
            </ThemedText>
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: "center", paddingVertical: 29 }}>
          <MotiView
            from={{ scale: 0.82, opacity: 0.35 }}
            animate={{ scale: 1.25, opacity: 0 }}
            transition={{ type: "timing", duration: 3000, loop: true }}
            style={styles.pulse}
          />
          <ProgressRing remaining={remaining} total={total} />
          <View style={styles.listening}>
            <Ionicons name="radio-outline" size={17} color="#fff" />
            <ThemedText
              variant="caption"
              style={{ color: "#fff", fontWeight: "700", marginLeft: 8 }}
            >
              Listening for nearby students
            </ThemedText>
          </View>
        </View>
        <View style={styles.card}>
          <View className="flex-row items-end justify-between">
            <View>
              <ThemedText variant="subheading">Live roster</ThemedText>
              <ThemedText variant="tiny" className="text-text-muted mt-1">
                Code {p.code} ·{" "}
                {p.manual === "true"
                  ? "Tap to manually mark"
                  : "Automatic check-in"}
              </ThemedText>
            </View>
            <View className="items-end">
              <ThemedText variant="heading" className="text-primary">
                {present}/{roster.length}
              </ThemedText>
              <ThemedText variant="tiny">checked in</ThemedText>
            </View>
          </View>
          <View className="mt-4 flex-row items-center rounded-2xl bg-surface-hover px-3">
            <Ionicons name="search-outline" size={18} color="#716d80" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search a student"
              placeholderTextColor="#716d80"
              className="flex-1 px-2 py-3 text-text"
            />
          </View>
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#5b3fd1" />
              <ThemedText variant="tiny" className="mt-3">
                Loading enrolled students…
              </ThemedText>
            </View>
          ) : (
            shown.map((s, i) => {
              const here = s.status === "present";
              return (
                <MotiView
                  key={s.membership_id}
                  from={{ opacity: 0, translateX: -18 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{
                    type: "timing",
                    duration: 280,
                    delay: Math.min(i, 8) * 55,
                  }}
                >
                  <TouchableOpacity
                    disabled={p.manual !== "true"}
                    onPress={() => void mark(s)}
                    className="py-3.5 flex-row items-center border-b border-border"
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${here ? "bg-success-soft" : "bg-surface-hover"}`}
                    >
                      <Ionicons
                        name={here ? "checkmark" : "person-outline"}
                        size={20}
                        color={here ? "#23815f" : "#716d80"}
                      />
                    </View>
                    <View className="flex-1">
                      <ThemedText variant="caption" className="font-semibold">
                        {s.full_name}
                      </ThemedText>
                      <ThemedText
                        variant="tiny"
                        className={here ? "text-success" : "text-text-muted"}
                      >
                        {here ? "Checked in just now" : "Waiting for check-in"}
                      </ThemedText>
                    </View>
                    {p.manual === "true" ? (
                      <Ionicons
                        name={here ? "checkmark-circle" : "add-circle-outline"}
                        size={23}
                        color={here ? "#23815f" : "#716d80"}
                      />
                    ) : null}
                  </TouchableOpacity>
                </MotiView>
              );
            })
          )}
        </View>
        <ThemedText
          variant="tiny"
          align="center"
          style={{ color: "#b9b3ca", marginTop: 17 }}
        >
          Session settings are locked while attendance is live.
        </ThemedText>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0d0b16", overflow: "hidden" },
  blob: { position: "absolute", width: 240, height: 240, borderRadius: 999 },
  ring: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: "rgba(17,14,28,.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  end: {
    backgroundColor: "rgba(255,255,255,.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.14)",
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  pulse: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#7654e6",
  },
  listening: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 99,
    backgroundColor: "rgba(104,70,220,.72)",
    borderWidth: 1,
    borderColor: "rgba(196,180,255,.35)",
  },
  card: {
    borderRadius: 28,
    backgroundColor: "#fbfaff",
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  },
});
