import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { href } from '@/lib/href';
import { AppText } from '@/ui/AppText';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { EmptyState } from '@/ui/EmptyState';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { useAppTheme } from '@/ui/useAppTheme';
import { startAttendanceSession } from '@/lib/api/attendance';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBLE } from '@/hooks/useBLE';
import type { PenaltyOption } from '@/lib/types/attendance';

const DURATIONS = [5, 10, 15] as const;
const PENALTIES: { label: string; value: PenaltyOption }[] = [
  { label: 'None', value: 0 },
  { label: '-0.5 pts', value: 0.5 },
  { label: '-1.0 pt', value: 1 },
  { label: '-2.0 pts', value: 2 },
];
const DISTANCES = [3, 6, 8, 12] as const;
const ASSESSMENTS = ['CA 1', 'CA 2', 'Exam'] as const;

export default function AttendanceConfigureScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { colors, shadow } = useAppTheme();
  const { classId, courseId, courseName } = useLocalSearchParams<{
    classId?: string;
    courseId?: string;
    courseName?: string;
  }>();
  const { accessToken } = useAuth();
  const now = useMemo(() => new Date(), []);

  const [duration, setDuration] = useState(10);
  const [custom, setCustom] = useState('20');
  const [useCustom, setUseCustom] = useState(false);
  const [penalty, setPenalty] = useState<PenaltyOption>(1);
  const [ble, setBle] = useState(true);
  const [manual, setManual] = useState(true);
  const [lateAfter, setLateAfter] = useState('5');
  const [distance, setDistance] = useState(6);
  const [assessment, setAssessment] = useState('CA 1');
  const [submitting, setSubmitting] = useState(false);

  const { prepareBluetoothForAdvertising, startBeacon } = useBLE();

  const start = async () => {
    const minutes = useCustom ? Number(custom) : duration;
    if (!accessToken || !classId) {
      console.warn('[Attendance] Cannot start: missing auth token or class id', {
        hasToken: !!accessToken,
        classId,
      });
      showToast.error('Unable to start attendance', 'Open attendance from an assigned course, then try again.');
      return;
    }
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) {
      showToast.error('Check session duration', 'Choose a duration between 1 and 120 minutes.');
      return;
    }

    const debugPayload = {
      classId,
      courseId,
      minutes,
      distanceMeters: distance,
      assessment,
      penalty,
      ble,
      manual,
      lateAfter: Number(lateAfter),
    };
    console.log('[Attendance] Start requested', debugPayload);
    setSubmitting(true);

    try {
      if (ble) await prepareBluetoothForAdvertising();
      const result = await startAttendanceSession(
        {
          class_id: classId,
          session_date: now.toISOString(),
          period: `mobile-${minutes}m`,
          penalty_deduction: penalty,
          ble_enabled: ble,
          ble_distance_meters: distance,
          manual_marking_enabled: manual,
          late_after_minutes: Number(lateAfter),
          assessment_target: assessment,
        },
        accessToken,
      );

      if (ble) await startBeacon(result.session_code);
      haptics.success();
      showToast.success('Attendance is live', 'Your class can now check in nearby.');

      const sessionRoot = segments[0] === 'teacher' ? '/teacher/attendance/session' : '/(student)/attendance/session';
      router.replace(
        href(
          `${sessionRoot}?sessionId=${result.session_id}&classId=${classId}&code=${result.session_code}&duration=${minutes}&courseId=${
            courseId ?? ''
          }&courseName=${encodeURIComponent(courseName ?? 'Course')}&manual=${manual}`,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error';
      console.error('[Attendance] Start failed', { ...debugPayload, message, error });
      showToast.error('Could not start attendance', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGate
      permission="start_attendance"
      fallback={
        <EmptyState
          icon="lock-closed-outline"
          title="Permission required"
          message="You need attendance permission for this course."
        />
      }
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 54 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <AppText variant="heading" weight="extrabold">
              Set Up Attendance
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {courseName ?? 'Course'} · {now.toLocaleDateString()}
            </AppText>
          </View>
        </View>

        {/* Duration Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Ionicons name="time-outline" size={20} color={colors.brand} />
            <AppText variant="subheading" weight="bold">
              Session Duration
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginBottom: 16 }}>
            Students can verify attendance while the live session runs.
          </AppText>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DURATIONS.map((item) => {
              const active = !useCustom && duration === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setUseCustom(false);
                    setDuration(item);
                    haptics.selection();
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: active ? colors.brand : colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.border,
                  }}
                >
                  <AppText variant="caption" weight="bold" style={{ color: active ? '#FFFFFF' : colors.text }}>
                    {item} min
                  </AppText>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => {
                setUseCustom(true);
                haptics.selection();
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 16,
                backgroundColor: useCustom ? colors.brand : colors.surfaceMuted,
                borderWidth: 1,
                borderColor: useCustom ? colors.brand : colors.border,
              }}
            >
              <AppText variant="caption" weight="bold" style={{ color: useCustom ? '#FFFFFF' : colors.text }}>
                Custom
              </AppText>
            </TouchableOpacity>
          </View>

          {useCustom ? (
            <TextInput
              value={custom}
              onChangeText={setCustom}
              keyboardType="number-pad"
              placeholder="Duration in minutes (e.g. 25)"
              placeholderTextColor={colors.textSubtle}
              style={{
                marginTop: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                backgroundColor: colors.field,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                color: colors.text,
              }}
            />
          ) : null}
        </View>

        {/* Absence Policy Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Ionicons name="shield-outline" size={20} color={colors.danger} />
            <AppText variant="subheading" weight="bold">
              Absence Penalty
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginBottom: 16 }}>
            Mark deductions cleanly separated from academic assessment tests.
          </AppText>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PENALTIES.map((item) => {
              const active = penalty === item.value;
              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => {
                    setPenalty(item.value);
                    haptics.selection();
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: active ? colors.danger : colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: active ? colors.danger : colors.border,
                  }}
                >
                  <AppText variant="caption" weight="bold" style={{ color: active ? '#FFFFFF' : colors.text }}>
                    {item.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* BLE Proximity & Teacher Controls Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
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
              <Ionicons name="radio-outline" size={22} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" weight="bold">
                Check-in Verification
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                Nearby BLE proximity detection & override
              </AppText>
            </View>
          </View>

          {/* BLE Toggle */}
          <TouchableOpacity
            onPress={() => {
              setBle(!ble);
              haptics.selection();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <AppText variant="label" weight="semibold">
                BLE Proximity Beacon
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Students must physically be inside the classroom
              </AppText>
            </View>
            <Ionicons
              name={ble ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={ble ? colors.brand : colors.textSubtle}
            />
          </TouchableOpacity>

          {/* Distance Selector */}
          {ble ? (
            <View style={{ paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <AppText variant="label" weight="semibold">
                  Maximum Radius
                </AppText>
                <AppText variant="caption" weight="bold" tone="brand">
                  {distance} meters
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DISTANCES.map((d) => {
                  const active = distance === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => {
                        setDistance(d);
                        haptics.selection();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: active ? colors.brandSoft : colors.surfaceMuted,
                        borderWidth: 1,
                        borderColor: active ? colors.brand : colors.border,
                      }}
                    >
                      <AppText variant="caption" weight="bold" style={{ color: active ? colors.brand : colors.text }}>
                        {d}m
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Manual Marking Toggle */}
          <TouchableOpacity
            onPress={() => {
              setManual(!manual);
              haptics.selection();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <AppText variant="label" weight="semibold">
                Manual Override
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Allow teacher to tap students in live roster
              </AppText>
            </View>
            <Ionicons
              name={manual ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={manual ? colors.brand : colors.textSubtle}
            />
          </TouchableOpacity>
        </View>

        {/* Assessment Target Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Ionicons name="document-attach-outline" size={20} color={colors.info} />
            <AppText variant="subheading" weight="bold">
              Assessment Target
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginBottom: 14 }}>
            Attendance penalties will attach to this assessment.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ASSESSMENTS.map((item) => {
              const active = assessment === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setAssessment(item);
                    haptics.selection();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: active ? colors.brand : colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.border,
                  }}
                >
                  <AppText variant="caption" weight="bold" style={{ color: active ? '#FFFFFF' : colors.text }}>
                    {item}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Late Arrival Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 26,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <AppText variant="subheading" weight="bold">
                Late Arrival Threshold
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Mark student status as late after
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={lateAfter}
                onChangeText={setLateAfter}
                keyboardType="number-pad"
                style={{
                  width: 58,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  backgroundColor: colors.field,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  textAlign: 'center',
                  fontWeight: '700',
                  color: colors.text,
                }}
              />
              <AppText variant="caption" tone="muted">
                min
              </AppText>
            </View>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          disabled={submitting}
          onPress={() => void start()}
          activeOpacity={0.85}
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            elevation: 4,
            shadowColor: '#5B3FD1',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
          }}
        >
          <LinearGradient
            colors={['#7F63EA', '#5B3FD1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 18,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="radio" size={20} color="#FFFFFF" />
                <AppText variant="label" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 16 }}>
                  Start Live Attendance Session
                </AppText>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </PermissionGate>
  );
}
