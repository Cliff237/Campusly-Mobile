import { useMemo, useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { href } from '@/lib/href';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { startAttendanceSession } from '@/lib/api/attendance';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBLE } from '@/hooks/useBLE';
import type { PenaltyOption } from '@/lib/types/attendance';

const DURATIONS = [5, 10, 15] as const;
const PENALTIES: { label: string; value: PenaltyOption }[] = [{ label: 'None', value: 0 }, { label: '-0.5', value: 0.5 }, { label: '-1', value: 1 }, { label: '-2', value: 2 }];

function AttendanceToggle({ label, value, onPress, icon }: { label: string; value: boolean; onPress: () => void; icon: keyof typeof Ionicons.glyphMap }) {
  return <TouchableOpacity onPress={onPress} className="py-3 flex-row items-center"><Ionicons name={icon} size={20} color="#6846dc" /><ThemedText variant="body" className="flex-1 ml-3">{label}</ThemedText><Ionicons name={value ? 'checkmark-circle' : 'ellipse-outline'} size={23} color="#6846dc" /></TouchableOpacity>;
}

export default function AttendanceConfigureScreen() {
  const router = useRouter(); const segments = useSegments(); const { classId, courseId, courseName } = useLocalSearchParams<{ classId?: string; courseId?: string; courseName?: string }>(); const { accessToken } = useAuth(); const { colorScheme } = useColorScheme(); const dark = colorScheme === 'dark'; const now = useMemo(() => new Date(), []);
  const [duration, setDuration] = useState(10); const [custom, setCustom] = useState('20'); const [useCustom, setUseCustom] = useState(false); const [penalty, setPenalty] = useState<PenaltyOption>(1); const [ble, setBle] = useState(true); const [manual, setManual] = useState(true); const [lateAfter, setLateAfter] = useState('5'); const [distance, setDistance] = useState(6); const [assessment, setAssessment] = useState('CA 1'); const [submitting, setSubmitting] = useState(false);
  const { prepareBluetooth, startBeacon } = useBLE();
  const start = async () => {
    const minutes = useCustom ? Number(custom) : duration;
    if (!accessToken || !classId) { console.warn('[Attendance] Cannot start: missing auth token or class id', { hasToken: !!accessToken, classId }); showToast.error('Unable to start attendance', 'Open attendance from an assigned course, then try again.'); return; }
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) { showToast.error('Check session duration', 'Choose a duration between 1 and 120 minutes.'); return; }
    const debugPayload = { classId, courseId, minutes, distanceMeters: distance, assessment, penalty, ble, manual, lateAfter: Number(lateAfter) };
    console.log('[Attendance] Start requested', debugPayload);
    setSubmitting(true);
    try { if (ble) await prepareBluetooth(); const result = await startAttendanceSession({ class_id: classId, session_date: now.toISOString(), period: `mobile-${minutes}m` }, accessToken); if (ble) await startBeacon(result.session_code); haptics.success(); showToast.success('Attendance is live', 'Your class can now check in nearby.'); const sessionRoot = segments[0] === 'teacher' ? '/teacher/attendance/session' : '/(student)/attendance/session'; router.replace(href(`${sessionRoot}?sessionId=${result.session_id}&classId=${classId}&code=${result.session_code}&duration=${minutes}&courseId=${courseId ?? ''}&courseName=${encodeURIComponent(courseName ?? 'Course')}&manual=${manual}`)); }
    catch (error) { const message = error instanceof Error ? error.message : 'Unexpected server error'; console.error('[Attendance] Start failed', { ...debugPayload, message, error }); showToast.error('Could not start attendance', message); }
    finally { setSubmitting(false); }
  };
  return <PermissionGate permission="start_attendance" fallback={<EmptyStateAnimation icon="lock-closed-outline" title="Permission required" subtitle="You need attendance permission for this course." />}><ScrollView className="flex-1 bg-mist dark:bg-bg-dark" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
    <View className="flex-row items-center mb-6"><TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark items-center justify-center mr-3"><Ionicons name="chevron-back" size={22} color={dark ? '#f8fafc' : '#0f172a'} /></TouchableOpacity><View><ThemedText variant="heading">Set up attendance</ThemedText><ThemedText variant="tiny">{courseName ?? 'Course'} · {now.toLocaleDateString()}</ThemedText></View></View>
    <View className="rounded-3xl bg-surface dark:bg-surface-dark p-5 mb-4"><ThemedText variant="subheading">Session duration</ThemedText><ThemedText variant="tiny" className="mt-1">Students can check in while the session is live.</ThemedText><View className="flex-row flex-wrap gap-2 mt-4">{DURATIONS.map((item) => <TouchableOpacity key={item} onPress={() => { setUseCustom(false); setDuration(item); haptics.selection(); }} className={`px-4 py-2 rounded-full border ${!useCustom && duration === item ? 'bg-ocean border-ocean' : 'border-border dark:border-border-dark'}`}><ThemedText variant="caption" className={!useCustom && duration === item ? 'text-white' : ''}>{item} min</ThemedText></TouchableOpacity>)}<TouchableOpacity onPress={() => setUseCustom(true)} className={`px-4 py-2 rounded-full border ${useCustom ? 'bg-ocean border-ocean' : 'border-border dark:border-border-dark'}`}><ThemedText variant="caption" className={useCustom ? 'text-white' : ''}>Custom</ThemedText></TouchableOpacity></View>{useCustom ? <TextInput value={custom} onChangeText={setCustom} keyboardType="number-pad" className="mt-3 rounded-xl border border-border dark:border-border-dark px-3 py-3 text-text dark:text-text-dark" placeholder="Minutes" placeholderTextColor="#64748b" /> : null}</View>
    <View className="rounded-3xl bg-surface dark:bg-surface-dark p-5 mb-4"><ThemedText variant="subheading">Absence policy</ThemedText><ThemedText variant="tiny" className="mt-1">Keep deductions separate from raw academic marks.</ThemedText><View className="flex-row gap-2 mt-4">{PENALTIES.map((item) => <TouchableOpacity key={item.label} onPress={() => setPenalty(item.value)} className={`px-4 py-2 rounded-full border ${penalty === item.value ? 'bg-berry border-berry' : 'border-border dark:border-border-dark'}`}><ThemedText variant="caption" className={penalty === item.value ? 'text-white' : ''}>{item.label}</ThemedText></TouchableOpacity>)}</View></View>
    <View className="rounded-3xl bg-surface dark:bg-surface-dark p-5 mb-4"><View className="flex-row items-center"><View className="w-9 h-9 rounded-xl bg-ocean-soft items-center justify-center mr-3"><Ionicons name="bluetooth-outline" size={20} color="#6846dc" /></View><View><ThemedText variant="subheading">Check-in controls</ThemedText><ThemedText variant="tiny">Secure nearby check-in and teacher override</ThemedText></View></View><AttendanceToggle label="BLE proximity check-in" value={ble} onPress={() => setBle(!ble)} icon="radio-outline" /><View className="flex-row items-center pb-3"><ThemedText variant="caption" className="flex-1">Maximum distance</ThemedText>{[3, 6, 8].map((item) => <TouchableOpacity key={item} onPress={() => setDistance(item)} className={`ml-2 rounded-xl px-2.5 py-2 ${distance === item ? 'bg-ocean' : 'bg-mist dark:bg-bg-dark'}`}><ThemedText variant="tiny" className={distance === item ? 'text-white font-bold' : ''}>{item}m</ThemedText></TouchableOpacity>)}</View><AttendanceToggle label="Allow manual marking" value={manual} onPress={() => setManual(!manual)} icon="people-outline" /></View>
    <View className="rounded-3xl bg-surface dark:bg-surface-dark p-5 mb-4"><ThemedText variant="subheading">Assessment target</ThemedText><ThemedText variant="tiny" className="mt-1">Attendance deductions are linked to this assessment.</ThemedText><View className="flex-row gap-2 mt-3">{['CA 1', 'CA 2', 'Exam'].map((item) => <TouchableOpacity key={item} onPress={() => setAssessment(item)} className={`rounded-xl px-3 py-2 ${assessment === item ? 'bg-ink' : 'bg-mist dark:bg-bg-dark'}`}><ThemedText variant="tiny" className={assessment === item ? 'text-white font-bold' : ''}>{item}</ThemedText></TouchableOpacity>)}</View></View>
    <View className="rounded-3xl bg-surface dark:bg-surface-dark p-5 mb-8"><ThemedText variant="subheading">Late arrival</ThemedText><View className="flex-row items-center mt-3"><ThemedText variant="caption">Mark late after</ThemedText><TextInput value={lateAfter} onChangeText={setLateAfter} keyboardType="number-pad" className="w-16 mx-3 rounded-xl bg-mist dark:bg-bg-dark px-3 py-2 text-center text-text dark:text-text-dark" /><ThemedText variant="caption">minutes</ThemedText></View></View>
    <TouchableOpacity disabled={submitting} onPress={() => void start()} className="rounded-2xl bg-ocean py-4 items-center"><ThemedText variant="body" className="text-white font-semibold">{submitting ? 'Starting…' : 'Start live session'}</ThemedText></TouchableOpacity>
  </ScrollView></PermissionGate>;
}
