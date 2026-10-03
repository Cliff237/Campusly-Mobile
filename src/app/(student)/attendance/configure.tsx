import { useMemo, useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { href } from '@/lib/href';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { startAttendanceSession } from '@/lib/api/attendance';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBLE } from '@/hooks/useBLE';
import type { PenaltyOption } from '@/lib/types/attendance';

const DURATIONS = [5, 10, 15] as const;
const PENALTIES: { label: string; value: PenaltyOption }[] = [{ label: 'None', value: 0 }, { label: '-0.5', value: 0.5 }, { label: '-1', value: 1 }, { label: '-2', value: 2 }];

/** Rounded card container shared by every settings section. */
const cardStyle = (border: string, surface: string) => ({ backgroundColor: surface, borderWidth: 1, borderColor: border, borderRadius: 22, padding: 18, marginBottom: 14 });


function AttendanceToggle({ label, value, onPress, icon, brand }: { label: string; value: boolean; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; brand: string }) {
  return <TouchableOpacity onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: value }} style={{ paddingVertical: 13, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}><Ionicons name={icon} size={19} color={brand} /><AppText variant="body" style={{ flex: 1, marginLeft: 12 }}>{label}</AppText><Ionicons name={value ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={value ? brand : '#B9B4C9'} /></TouchableOpacity>;
}

export default function AttendanceConfigureScreen() {
  const router = useRouter(); const segments = useSegments(); const { classId, courseId, courseName } = useLocalSearchParams<{ classId?: string; courseId?: string; courseName?: string }>(); const { accessToken } = useAuth(); const { colorScheme } = useColorScheme(); const dark = colorScheme === 'dark'; const { colors } = useAppTheme(); const brand = colors.brand; const soft = dark ? colors.surfaceMuted : colors.brandSoft; const now = useMemo(() => new Date(), []);
  const [duration, setDuration] = useState(10); const [custom, setCustom] = useState('20'); const [useCustom, setUseCustom] = useState(false); const [penalty, setPenalty] = useState<PenaltyOption>(1); const [ble, setBle] = useState(true); const [manual, setManual] = useState(true); const [lateAfter, setLateAfter] = useState('5'); const [distance, setDistance] = useState(6); const [assessment, setAssessment] = useState('CA 1'); const [submitting, setSubmitting] = useState(false);
  const { prepareBluetoothForAdvertising, startBeacon } = useBLE();
  const start = async () => {
    const minutes = useCustom ? Number(custom) : duration;
    if (!accessToken || !classId) { console.warn('[Attendance] Cannot start: missing auth token or class id', { hasToken: !!accessToken, classId }); showToast.error('Unable to start attendance', 'Open attendance from an assigned course, then try again.'); return; }
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) { showToast.error('Check session duration', 'Choose a duration between 1 and 120 minutes.'); return; }
    const debugPayload = { classId, courseId, minutes, distanceMeters: distance, assessment, penalty, ble, manual, lateAfter: Number(lateAfter) };
    console.log('[Attendance] Start requested', debugPayload);
    setSubmitting(true);
    try { if (ble) await prepareBluetoothForAdvertising(); const result = await startAttendanceSession({ class_id: classId, session_date: now.toISOString(), period: `mobile-${minutes}m`, penalty_deduction: penalty, ble_enabled: ble, ble_distance_meters: distance, manual_marking_enabled: manual, late_after_minutes: Number(lateAfter), assessment_target: assessment }, accessToken); if (ble) await startBeacon(result.session_code); haptics.success(); showToast.success('Attendance is live', 'Your class can now check in nearby.'); const sessionRoot = segments[0] === 'teacher' ? '/teacher/attendance/session' : '/(student)/attendance/session'; router.replace(href(`${sessionRoot}?sessionId=${result.session_id}&classId=${classId}&code=${result.session_code}&duration=${minutes}&courseId=${courseId ?? ''}&courseName=${encodeURIComponent(courseName ?? 'Course')}&manual=${manual}`)); }
    catch (error) { const message = error instanceof Error ? error.message : 'Unexpected server error'; console.error('[Attendance] Start failed', { ...debugPayload, message, error }); showToast.error('Could not start attendance', message); }
    finally { setSubmitting(false); }
  };
  const pill = (active: boolean, tint?: string) => ({
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: active ? (tint ?? colors.brand) : (dark ? colors.surfaceMuted : '#FFFFFF'),
    borderColor: active ? (tint ?? colors.brand) : colors.border,
  });
  return <PermissionGate permission="start_attendance" fallback={<EmptyState icon="lock-closed-outline" title="Permission required" message="You need attendance permission for this course." />}><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
    {/* Header */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22 }}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dark ? colors.surfaceMuted : '#FFFFFF', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Ionicons name="chevron-back" size={21} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <AppText variant="heading">Set up attendance</AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>{courseName ?? 'Course'} · {now.toLocaleDateString()}</AppText>
      </View>
      <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="radio-outline" size={20} color="#FFFFFF" />
      </LinearGradient>
    </View>

    {/* Session duration */}
    <View style={cardStyle(colors.border, colors.surface)}>
      <AppText variant="subheading">Session duration</AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 3 }}>Students can check in while the session is live.</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 }}>
        {DURATIONS.map((item) => <TouchableOpacity key={item} onPress={() => { setUseCustom(false); setDuration(item); haptics.selection(); }} style={pill(!useCustom && duration === item)}><AppText variant="caption" weight={useCustom && duration === item ? 'semibold' : 'bold'} color={!useCustom && duration === item ? '#FFFFFF' : colors.textMuted}>{item} min</AppText></TouchableOpacity>)}
        <TouchableOpacity onPress={() => setUseCustom(true)} style={pill(useCustom)}><AppText variant="caption" weight="bold" color={useCustom ? '#FFFFFF' : colors.textMuted}>Custom</AppText></TouchableOpacity>
      </View>
      {useCustom ? <TextInput value={custom} onChangeText={setCustom} keyboardType="number-pad" style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: dark ? colors.surfaceMuted : '#F7F8FC', paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15 }} placeholder="Minutes" placeholderTextColor={colors.textMuted} /> : null}
    </View>

    {/* Absence policy */}
    <View style={cardStyle(colors.border, colors.surface)}>
      <AppText variant="subheading">Absence policy</AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 3 }}>Keep deductions separate from raw academic marks.</AppText>
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
        {PENALTIES.map((item) => <TouchableOpacity key={item.label} onPress={() => setPenalty(item.value)} style={pill(penalty === item.value, colors.danger)}><AppText variant="caption" weight="bold" color={penalty === item.value ? '#FFFFFF' : colors.textMuted}>{item.label}</AppText></TouchableOpacity>)}
      </View>
    </View>

    {/* Check-in controls */}
    <View style={cardStyle(colors.border, colors.surface)}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: soft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name="bluetooth-outline" size={20} color={brand} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">Check-in controls</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>Secure nearby check-in and teacher override</AppText>
        </View>
      </View>
      <AttendanceToggle label="BLE proximity check-in" value={ble} onPress={() => setBle(!ble)} icon="radio-outline" brand={brand} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
        <AppText variant="caption" tone="muted" weight="semibold" style={{ flex: 1 }}>Maximum distance</AppText>
        {[3, 6, 8].map((item) => <TouchableOpacity key={item} onPress={() => setDistance(item)} style={{ marginLeft: 8, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: distance === item ? brand : (dark ? colors.surfaceMuted : '#F1F0F7'), borderWidth: 1, borderColor: distance === item ? brand : colors.border }}><AppText variant="caption" weight="bold" color={distance === item ? '#FFFFFF' : colors.textMuted}>{item}m</AppText></TouchableOpacity>)}
      </View>
      <AttendanceToggle label="Allow manual marking" value={manual} onPress={() => setManual(!manual)} icon="people-outline" brand={brand} />
    </View>

    {/* Assessment target */}
    <View style={cardStyle(colors.border, colors.surface)}>
      <AppText variant="subheading">Assessment target</AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 3 }}>Attendance deductions are linked to this assessment.</AppText>
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 13 }}>
        {['CA 1', 'CA 2', 'Exam'].map((item) => <TouchableOpacity key={item} onPress={() => setAssessment(item)} style={{ borderRadius: 14, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: assessment === item ? (dark ? colors.surfaceMuted : colors.brandSoft) : (dark ? colors.surfaceMuted : '#F7F8FC'), borderWidth: 1.5, borderColor: assessment === item ? brand : colors.border }}><AppText variant="caption" weight="bold" color={assessment === item ? brand : colors.textMuted}>{item}</AppText></TouchableOpacity>)}
      </View>
    </View>

    {/* Late arrival */}
    <View style={{ ...cardStyle(colors.border, colors.surface), marginBottom: 24 }}>
      <AppText variant="subheading">Late arrival</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <AppText variant="caption" tone="muted">Mark late after</AppText>
        <TextInput value={lateAfter} onChangeText={setLateAfter} keyboardType="number-pad" style={{ width: 64, marginHorizontal: 12, borderRadius: 12, backgroundColor: dark ? colors.surfaceMuted : '#F1F0F7', borderWidth: 1, borderColor: colors.border, paddingVertical: 8, textAlign: 'center', color: colors.text, fontSize: 15 }} />
        <AppText variant="caption" tone="muted">minutes</AppText>
      </View>
    </View>

    <Button title={submitting ? 'Starting…' : 'Start live session'} variant="primary" size="lg" fullWidth loading={submitting} loadingLabel="Starting…" onPress={() => void start()} />
  </ScrollView></PermissionGate>;
}
