import { useEffect, useRef } from 'react';
import { Modal, View, TouchableOpacity, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { BrandMark } from '@/ui/brand/BrandMark';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import type { ActiveAttendanceSession } from '@/lib/types/attendance';

interface AttendanceCheckinModalProps {
  visible: boolean;
  session: ActiveAttendanceSession | null;
  onClose: () => void;
  onCheckIn: (session: ActiveAttendanceSession) => Promise<void>;
  onManualCheckIn?: (session: ActiveAttendanceSession) => Promise<void>;
  state?: 'idle' | 'permission' | 'searching' | 'verifying' | 'not-found' | 'success' | 'expired' | 'error';
  message?: string;
}

export function AttendanceCheckinModal({
  visible,
  session,
  onClose,
  onCheckIn,
  onManualCheckIn,
  state = 'idle',
  message,
}: AttendanceCheckinModalProps) {
  const { colors, shadow } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.88);
    }
  }, [visible, fadeAnim, scaleAnim]);

  // Pulse animation when searching or verifying
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (state === 'searching' || state === 'verifying') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => loop?.stop();
  }, [state, pulseAnim]);

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleCheckIn = async () => {
    if (!session) return;
    haptics.selection();
    await onCheckIn(session);
  };

  const handleManualCheckIn = async () => {
    if (!session || !onManualCheckIn) return;
    haptics.selection();
    await onManualCheckIn(session);
  };

  const remaining = session?.remaining_seconds ?? 0;
  const checkedIn = session?.is_checked_in || state === 'success';
  const busy = state === 'searching' || state === 'verifying';
  const unavailable = state === 'expired';

  const statusMessage =
    state === 'permission'
      ? 'Bluetooth access is required to verify that you are physically in the classroom.'
      : state === 'searching'
      ? 'Searching for the attendance beacon signal…'
      : state === 'verifying'
      ? 'Attendance signal detected. Verifying your attendance…'
      : state === 'not-found'
      ? 'Signal not detected. Make sure Bluetooth is on and you are inside the classroom.'
      : state === 'expired'
      ? 'This attendance session has ended.'
      : state === 'error'
      ? message ?? 'We could not verify your attendance. Please retry while the session is active.'
      : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={hideModal}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(10, 8, 20, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            width: '100%',
            maxWidth: 420,
            borderRadius: 28,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            elevation: 10,
            shadowColor: '#43299F',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
          }}
        >
          {/* Header with Campusly Brand Logo */}
          <LinearGradient
            colors={['#1D1242', '#351B78', '#5B3FD1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: 24,
              paddingBottom: 22,
              paddingHorizontal: 22,
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <TouchableOpacity
              onPress={hideModal}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={19} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Campusly "C" Logo with Beacon Radar Pulse */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 6 }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 82,
                  height: 82,
                  borderRadius: 41,
                  backgroundColor: 'rgba(52, 211, 153, 0.25)',
                  transform: [{ scale: pulseAnim }],
                }}
              />
              <BrandMark size={52} variant="glass" />
            </View>

            <AppText variant="overline" weight="extrabold" style={{ color: '#D1C6FF', letterSpacing: 1.2, marginTop: 10 }}>
              CAMPUSLY ATTENDANCE
            </AppText>
            <AppText
              variant="heading"
              weight="extrabold"
              style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 4, fontSize: 20 }}
              numberOfLines={2}
            >
              {session?.course_name || 'Live Class Session'}
            </AppText>
          </LinearGradient>

          {/* Modal Content */}
          <View style={{ padding: 22 }}>
            {/* Timer countdown pill */}
            {session ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: 14,
                  paddingVertical: 10,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="time-outline" size={17} color={remaining < 60 ? colors.warning : colors.brand} />
                <AppText variant="caption" weight="bold" style={{ color: remaining < 60 ? colors.warning : colors.text }}>
                  {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')} time remaining
                </AppText>
              </View>
            ) : null}

            {/* Status Feedback Banner */}
            {statusMessage && state !== 'success' ? (
              <View
                style={{
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  backgroundColor:
                    state === 'not-found' || state === 'error'
                      ? colors.dangerSoft
                      : state === 'searching' || state === 'verifying'
                      ? colors.brandSoft
                      : colors.warningSoft,
                  borderWidth: 1,
                  borderColor:
                    state === 'not-found' || state === 'error'
                      ? 'rgba(200, 52, 79, 0.25)'
                      : state === 'searching' || state === 'verifying'
                      ? 'rgba(91, 63, 209, 0.25)'
                      : 'rgba(217, 119, 6, 0.25)',
                }}
              >
                <Ionicons
                  name={
                    state === 'not-found' || state === 'error'
                      ? 'alert-circle-outline'
                      : state === 'searching' || state === 'verifying'
                      ? 'radio-outline'
                      : 'information-circle-outline'
                  }
                  size={20}
                  color={
                    state === 'not-found' || state === 'error'
                      ? colors.danger
                      : state === 'searching' || state === 'verifying'
                      ? colors.brand
                      : colors.warning
                  }
                />
                <AppText
                  variant="caption"
                  weight="medium"
                  style={{
                    flex: 1,
                    color:
                      state === 'not-found' || state === 'error'
                        ? colors.onDangerSoft
                        : state === 'searching' || state === 'verifying'
                        ? colors.onBrandSoft
                        : colors.onWarningSoft,
                    lineHeight: 18,
                  }}
                >
                  {statusMessage}
                </AppText>
              </View>
            ) : null}

            {/* Success State */}
            {state === 'success' ? (
              <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: colors.successSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: colors.success,
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="checkmark" size={38} color={colors.success} />
                </View>
                <AppText variant="heading" weight="extrabold" style={{ color: colors.success }}>
                  Attendance Confirmed!
                </AppText>
                <AppText variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 12 }}>
                  Your presence has been verified and securely recorded for this course session.
                </AppText>

                <TouchableOpacity
                  onPress={hideModal}
                  style={{
                    marginTop: 20,
                    width: '100%',
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: colors.surfaceMuted,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <AppText variant="label" weight="bold">
                    Done
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Primary Action Button */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Mark Present"
                  disabled={checkedIn || unavailable || busy}
                  onPress={handleCheckIn}
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    elevation: 3,
                    shadowColor: '#5B3FD1',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                  }}
                >
                  <LinearGradient
                    colors={
                      checkedIn
                        ? [colors.success, '#0C6E4E']
                        : unavailable
                        ? ['#857F9C', '#6A6482']
                        : ['#7F63EA', '#5B3FD1']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    {busy ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <AppText variant="label" weight="extrabold" style={{ color: '#FFFFFF' }}>
                          {state === 'searching' ? 'Searching Beacon…' : 'Verifying Distance…'}
                        </AppText>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name={checkedIn ? 'checkmark-circle' : 'radio'}
                          size={20}
                          color="#FFFFFF"
                        />
                        <AppText variant="label" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 15 }}>
                          {checkedIn
                            ? 'Marked Present'
                            : unavailable
                            ? 'Session Expired'
                            : state === 'not-found' || state === 'error'
                            ? 'Retry Verification'
                            : 'Mark Present (Proximity)'}
                        </AppText>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Manual Fallback */}
                {(state === 'not-found' || state === 'error') && onManualCheckIn ? (
                  <TouchableOpacity
                    onPress={handleManualCheckIn}
                    style={{
                      marginTop: 10,
                      paddingVertical: 13,
                      borderRadius: 16,
                      backgroundColor: colors.surfaceMuted,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <AppText variant="caption" weight="semibold">
                      Mark Present Manually
                    </AppText>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
