import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AppText } from "@/ui/AppText";
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
          color = i < 18 ? "#8B5CF6" : i < 40 ? "#34D399" : "#FBBF24";
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
        <AppText
          variant="display"
          color={remaining < 60 ? "#FBBF24" : "#FFFFFF"}
          style={{ fontSize: 43, lineHeight: 50 }}
        >
          {clock}
        </AppText>
        <AppText
          variant="caption"
          color="#B9B3CA"
          style={{ letterSpacing: 1, fontSize: 10.5, lineHeight: 14 }}
        >
          TIME REMAINING
        </AppText>
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
  const isPollingRef = useRef(false);
  const name = useMemo(() => {
    try {
      return decodeURIComponent(p.courseName || "Course");
    } catch {
      return p.courseName || "Course";
    }
  }, [p.courseName]);
  const load = useCallback(async (isInitialLoad = false) => {
    if (!accessToken || !p.classId) return;
    if (isInitialLoad) setLoading(true);
    try {
      console.log("[Attendance] Loading live roster", {
        sessionId: p.sessionId,
        classId: p.classId,
        isInitialLoad,
      });
      setRoster(await fetchAttendanceRoster(p.classId, accessToken, p.sessionId));
    } catch (e) {
      console.error("[Attendance] Roster load failed", e);
      if (isInitialLoad) {
        showToast.error(
          "Roster unavailable",
          e instanceof Error ? e.message : "Could not load class roster",
        );
      }
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [accessToken, p.classId, p.sessionId]);
  useEffect(() => {
    void load(true);
  }, [load]);

  // Poll for roster updates every 3 seconds (background refresh without loading spinner)
  useEffect(() => {
    if (!accessToken || !p.classId || closing) return;
    
    const interval = setInterval(() => {
      void load(false); // Don't show loading spinner during polling
    }, 3000);

    return () => clearInterval(interval);
  }, [accessToken, p.classId, closing, load]);
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
      // Reload roster without loading spinner
      void load(false);
    } catch (e) {
      console.error("[Attendance] Manual mark failed", e);
      showToast.error(
        "Mark was not saved",
        e instanceof Error ? e.message : "Try again",
      );
      void load(true);
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
          { backgroundColor: "#5B3FD1", top: -85, left: -75 },
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
          { backgroundColor: "#14B8A6", top: 160, right: -95 },
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
          { backgroundColor: "#7C3AED", bottom: -135, left: 70 },
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
              <AppText
                variant="caption"
                color="#CFC5FF"
                weight="extrabold"
                style={{ letterSpacing: 1.3, fontSize: 11, lineHeight: 14 }}
              >
                LIVE ATTENDANCE
              </AppText>
            </View>
            <AppText
              variant="subheading"
              color="#FFFFFF"
              style={{ marginTop: 5 }}
            >
              {name}
            </AppText>
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
            <AppText
              variant="caption"
              color="#FFD9DF"
              weight="bold"
              style={{ fontSize: 12.5, lineHeight: 16 }}
            >
              {closing ? "Ending…" : "End"}
            </AppText>
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
            <AppText
              variant="caption"
              color="#FFFFFF"
              weight="bold"
              style={{ marginLeft: 8 }}
            >
              Listening for nearby students
            </AppText>
          </View>
        </View>
        <View style={styles.card}>
          <View className="flex-row items-end justify-between">
            <View>
              <AppText variant="subheading" color="#242039">Live roster</AppText>
              <AppText variant="caption" color="#706B82" style={{ marginTop: 3 }}>
                Code {p.code} ·{" "}
                {p.manual === "true"
                  ? "Tap to manually mark"
                  : "Automatic check-in"}
              </AppText>
            </View>
            <View className="items-end">
              <AppText variant="heading" className="text-primary">
                {present}/{roster.length}
              </AppText>
              <AppText variant="caption" color="#706B82">checked in</AppText>
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
              <AppText variant="caption" color="#706B82" style={{ marginTop: 10 }}>
                Loading enrolled students…
              </AppText>
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
                      <AppText variant="label" weight="bold" color="#242039" numberOfLines={1}>
                        {s.full_name}
                      </AppText>
                      <AppText
                        variant="caption"
                        color={here ? "#25855F" : "#706B82"}
                      >
                        {here ? "Checked in just now" : "Waiting for check-in"}
                      </AppText>
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
        <AppText
          variant="caption"
          align="center"
          color="#B9B3CA"
          style={{ marginTop: 17 }}
        >
          Session settings are locked while attendance is live.
        </AppText>
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
    backgroundColor: "rgba(248,113,113,.18)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,.45)",
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  pulse: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#5B3FD1",
  },
  listening: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 99,
    backgroundColor: "rgba(91,63,209,.75)",
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
