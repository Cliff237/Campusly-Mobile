import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { BrandMark } from '@/ui/brand/BrandMark';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { useAppTheme } from '@/ui/useAppTheme';
import { useScreenBottomPadding } from '@/ui/tabBarOptions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  closeAttendanceSession,
  fetchAttendanceRoster,
  manualMarkAttendance,
} from '@/lib/api/attendance';
import { useAuth } from '@/lib/auth/AuthContext';
import type { AttendanceRosterStudent } from '@/lib/types/attendance';
import { useBLE } from '@/hooks/useBLE';

type Student = AttendanceRosterStudent & { changed?: boolean };
const SIZE = 210;
const DOTS = 48;

function LiveBeaconTimer({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const active = Math.ceil(Math.max(0, remaining / total) * DOTS);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = remaining < 60;

  return (
    <View style={styles.ring}>
      {/* Concentric radar beacon dots */}
      {Array.from({ length: DOTS }, (_, i) => {
        const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
        const color = isUrgent ? '#FBBF24' : i < active ? '#34D399' : 'rgba(255, 255, 255, 0.12)';
        return (
          <MotiView
            key={i}
            animate={{
              opacity: i < active ? 1 : 0.15,
              scale: i < active ? 1 : 0.7,
            }}
            transition={{ type: 'timing', duration: 400 }}
            style={{
              position: 'absolute',
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: color,
              left: SIZE / 2 + Math.cos(a) * 98 - 2.5,
              top: SIZE / 2 + Math.sin(a) * 98 - 2.5,
            }}
          />
        );
      })}

      {/* Core Display Circle */}
      <View style={styles.core}>
        <AppText
          variant="display"
          weight="extrabold"
          style={{
            color: isUrgent ? '#FBBF24' : '#FFFFFF',
            fontSize: 40,
            lineHeight: 46,
            letterSpacing: -0.5,
          }}
        >
          {clock}
        </AppText>
        <AppText
          variant="caption"
          weight="extrabold"
          style={{ color: '#D1C6FF', letterSpacing: 1.2, marginTop: 2, fontSize: 10 }}
        >
          SESSION REMAINING
        </AppText>
      </View>
    </View>
  );
}

export default function LiveAttendanceScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useAppTheme();
  const bottomPadding = useScreenBottomPadding(36);
  const insets = useSafeAreaInsets();
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
  const [remaining, setRemaining] = useState(total);
  const [roster, setRoster] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [closing, setClosing] = useState(false);

  const name = useMemo(() => {
    try {
      return decodeURIComponent(p.courseName || 'Course');
    } catch {
      return p.courseName || 'Course';
    }
  }, [p.courseName]);

  const load = useCallback(
    async (isInitialLoad = false) => {
      if (!accessToken || !p.classId) return;
      if (isInitialLoad) setLoading(true);
      try {
        const data = await fetchAttendanceRoster(p.classId, accessToken, p.sessionId);
        setRoster(data);
      } catch (e) {
        console.error('[Attendance] Roster load failed', e);
        if (isInitialLoad) {
          showToast.error('Roster unavailable', e instanceof Error ? e.message : 'Could not load class roster');
        }
      } finally {
        if (isInitialLoad) setLoading(false);
      }
    },
    [accessToken, p.classId, p.sessionId],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  // Background polling for real-time check-in updates
  useEffect(() => {
    if (!accessToken || !p.classId || closing) return;
    const interval = setInterval(() => {
      void load(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [accessToken, p.classId, closing, load]);

  useEffect(() => () => {
    void stopBeacon();
  }, [stopBeacon]);

  const present = roster.filter((s) => s.status === 'present').length;
  const shown = roster.filter((s) => s.full_name.toLowerCase().includes(query.trim().toLowerCase()));

  const mark = async (student: Student) => {
    if (!accessToken || p.manual !== 'true') return;
    const status = student.status === 'present' ? 'absent' : 'present';
    setRoster((all) =>
      all.map((s) => (s.membership_id === student.membership_id ? { ...s, status, changed: true } : s)),
    );
    try {
      await manualMarkAttendance(p.sessionId, student.membership_id, status, accessToken);
      haptics.selection();
      void load(false);
    } catch (e) {
      console.error('[Attendance] Manual mark failed', e);
      showToast.error('Mark was not saved', e instanceof Error ? e.message : 'Try again');
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
        console.warn('[Attendance] Beacon cleanup failed', error);
      }
      const result = await closeAttendanceSession(p.sessionId, accessToken);
      haptics.success();
      showToast.success('Attendance completed', `${result.total_present} present · ${result.total_absent} absent`);
      const coursePath =
        segments[0] === 'teacher'
          ? `/teacher/courses/${p.courseId}?name=${encodeURIComponent(name)}&classId=${p.classId}`
          : `/(student)/courses/${p.courseId}`;
      router.replace(coursePath as never);
    } catch (e) {
      console.error('[Attendance] Close failed', e);
      showToast.error('Session is still live', e instanceof Error ? e.message : 'Try again');
    } finally {
      setClosing(false);
    }
  };

  const confirmEndSession = () => {
    haptics.warning();
    Alert.alert(
      'End live attendance?',
      'Students not marked present will be marked absent when this session closes.',
      [
        { text: 'Keep Session Open', style: 'cancel' },
        { text: 'End Session', style: 'destructive', onPress: () => void finish() },
      ],
    );
  };

  useEffect(() => {
    const id = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !closing) void finish();
  }, [remaining, closing]);

  const progressPercentage = roster.length > 0 ? Math.round((present / roster.length) * 100) : 0;

  return (
    <View style={styles.screen}>
      {/* Decorative ambient gradient blobs */}
      <MotiView
        from={{ translateX: -20, opacity: 0.15 }}
        animate={{ translateX: 25, opacity: 0.28 }}
        transition={{ type: 'timing', duration: 7000, loop: true, repeatReverse: true }}
        style={[styles.blob, { backgroundColor: '#5B3FD1', top: -70, left: -60 }]}
      />
      <MotiView
        from={{ translateY: -15, opacity: 0.1 }}
        animate={{ translateY: 20, opacity: 0.22 }}
        transition={{ type: 'timing', duration: 8000, loop: true, repeatReverse: true }}
        style={[styles.blob, { backgroundColor: '#0F7A56', top: 140, right: -80 }]}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 96 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Session Bar with Campusly Brand Logo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <BrandMark size={38} variant="glass" />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MotiView
                    from={{ opacity: 0.4, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' }}
                  />
                  <AppText variant="overline" weight="extrabold" style={{ color: '#34D399', letterSpacing: 1.2 }}>
                    LIVE BEACON
                  </AppText>
                </View>
                <AppText variant="subheading" weight="bold" style={{ color: '#FFFFFF', marginTop: 2 }}>
                  {name}
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={closing}
              onPress={confirmEndSession}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.endHeaderBtn}
              accessibilityRole="button"
              accessibilityLabel="End attendance session"
            >
              {closing ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 5 }} />
              ) : (
                <Ionicons name="stop-circle" size={17} color="#FDA4AF" style={{ marginRight: 5 }} />
              )}
              <AppText variant="caption" weight="extrabold" style={{ color: '#FFFFFF' }}>
                {closing ? 'Ending…' : 'End'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Central Beacon Animation & Countdown Timer */}
          <View style={{ alignItems: 'center', paddingVertical: 14 }}>
            <MotiView
              from={{ scale: 0.85, opacity: 0.3 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ type: 'timing', duration: 2600, loop: true }}
              style={styles.pulse}
            />
            <MotiView
              from={{ scale: 0.7, opacity: 0.2 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ type: 'timing', duration: 3200, loop: true, delay: 600 }}
              style={styles.pulse}
            />

            <LiveBeaconTimer remaining={remaining} total={total} />

            {/* Session Code & Radar Status Bar */}
            <View style={styles.listening}>
              <Ionicons name="radio" size={17} color="#34D399" />
              <AppText variant="caption" weight="extrabold" style={{ color: '#FFFFFF', marginLeft: 8 }}>
                BROADCASTING CODE: {p.code}
              </AppText>
            </View>
          </View>

          {/* Live Roster Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <AppText variant="subheading" weight="bold">
                  Class Roster
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {p.manual === 'true' ? 'Tap student to manually override' : 'Automatic BLE check-in active'}
                </AppText>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="heading" weight="extrabold" tone="brand">
                  {present}/{roster.length}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {progressPercentage}% present
                </AppText>
              </View>
            </View>

            {/* Progress Bar */}
            <View
              style={{
                height: 6,
                backgroundColor: colors.surfaceMuted,
                borderRadius: 3,
                marginTop: 12,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  backgroundColor: colors.success,
                  borderRadius: 3,
                }}
              />
            </View>

            {/* Search Input */}
            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 16,
                backgroundColor: colors.field,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search enrolled students..."
                placeholderTextColor={colors.textSubtle}
                style={{
                  flex: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  color: colors.text,
                  fontSize: 14,
                }}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Student List */}
            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color={colors.brand} />
                <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>
                  Loading enrolled students…
                </AppText>
              </View>
            ) : shown.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <AppText variant="caption" tone="muted">
                  No students found matching "{query}"
                </AppText>
              </View>
            ) : (
              shown.map((s, i) => {
                const here = s.status === 'present';
                return (
                  <MotiView
                    key={s.membership_id}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 250, delay: Math.min(i, 10) * 35 }}
                  >
                    <TouchableOpacity
                      disabled={p.manual !== 'true'}
                      onPress={() => void mark(s)}
                      style={{
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: here ? colors.successSoft : colors.surfaceMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          borderWidth: 1,
                          borderColor: here ? colors.success : colors.border,
                        }}
                      >
                        <Ionicons
                          name={here ? 'checkmark' : 'person-outline'}
                          size={19}
                          color={here ? colors.success : colors.textMuted}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <AppText variant="label" weight="semibold">
                          {s.full_name}
                        </AppText>
                        <AppText
                          variant="caption"
                          style={{ color: here ? colors.success : colors.textMuted, marginTop: 1 }}
                        >
                          {here ? 'Verified Present' : 'Awaiting Check-in'}
                        </AppText>
                      </View>

                      {p.manual === 'true' ? (
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 12,
                            backgroundColor: here ? colors.successSoft : colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor: here ? colors.success : colors.border,
                          }}
                        >
                          <AppText
                            variant="caption"
                            weight="bold"
                            style={{ color: here ? colors.success : colors.text }}
                          >
                            {here ? 'Present' : 'Tap to mark'}
                          </AppText>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  </MotiView>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Floating Thumb-Friendly Bottom Action Bar */}
        <View
          style={[
            styles.bottomBarContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={closing}
            onPress={confirmEndSession}
            style={styles.bottomEndBtn}
            accessibilityRole="button"
            accessibilityLabel="End live attendance session"
          >
            <LinearGradient
              colors={['#E11D48', '#BE123C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bottomEndGradient}
            >
              {closing ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="stop-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <AppText variant="subheading" weight="extrabold" style={{ color: '#FFFFFF' }}>
                {closing ? 'Ending Live Attendance…' : 'End Live Attendance'}
              </AppText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E0B1C', overflow: 'hidden' },
  blob: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  ring: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(23, 18, 41, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endHeaderBtn: {
    backgroundColor: 'rgba(225, 29, 72, 0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  bottomBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(14, 11, 28, 0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomEndBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  bottomEndGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  pulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#5B3FD1',
    top: 5,
  },
  listening: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(91, 63, 209, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  card: {
    borderRadius: 26,
    padding: 20,
    marginTop: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
});
