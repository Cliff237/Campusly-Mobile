import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { useModalPresence } from '@/ui/modalStore';
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
  message 
}: AttendanceCheckinModalProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  useModalPresence(visible);

  const showModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  if (visible) {
    showModal();
  }

  const handleCheckIn = async () => {
    if (!session) return;
    haptics.success();
    await onCheckIn(session);
  };

  const handleManualCheckIn = async () => {
    if (!session || !onManualCheckIn) return;
    haptics.success();
    await onManualCheckIn(session);
  };

  const remaining = session?.remaining_seconds ?? 0;
  const checkedIn = session?.is_checked_in || state === 'success';
  const busy = state === 'searching' || state === 'verifying';
  const unavailable = state === 'expired';

  console.log('[AttendanceCheckinModal] State:', state, 'Session:', session?.session_id, 'CheckedIn:', checkedIn);

  const statusMessage = state === 'permission'
    ? 'Bluetooth access is required to verify that you are in the classroom.'
    : state === 'searching'
      ? 'Searching for the attendance signal…'
      : state === 'verifying'
        ? 'Attendance signal detected. Verifying your attendance…'
        : state === 'not-found'
          ? 'Attendance signal not detected. Enable Bluetooth and move closer to the classroom, then retry.'
          : state === 'expired'
            ? 'Attendance session has ended.'
            : state === 'error'
              ? (message ?? 'We could not verify your attendance. Please retry while the session is active.')
              : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={hideModal}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
          className="w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1">
              <ThemedText variant="subheading" className="font-bold text-emerald-600 dark:text-emerald-400">
                📚 Attendance Check-in
              </ThemedText>
              {session && (
                <ThemedText variant="body" className="text-slate-600 dark:text-slate-300 mt-1">
                  {session.course_name}
                </ThemedText>
              )}
            </View>
            <TouchableOpacity onPress={hideModal} className="p-2">
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Timer */}
          {session && (
            <View className="bg-slate-100 dark:bg-slate-700 rounded-xl p-3 mb-4">
              <ThemedText variant="caption" className="text-center text-slate-600 dark:text-slate-300">
                ⏱️ {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')} remaining
              </ThemedText>
            </View>
          )}

          {/* Status Message */}
          {statusMessage && (
            <View className={`rounded-xl p-3 mb-4 flex-row items-start ${
              state === 'not-found' || state === 'error' 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : 'bg-emerald-50 dark:bg-emerald-900/20'
            }`}>
              <Ionicons 
                name={state === 'not-found' || state === 'error' ? 'warning-outline' : 'bluetooth-outline'} 
                size={20} 
                color={state === 'not-found' || state === 'error' ? '#d97706' : '#0f766e'} 
              />
              <ThemedText variant="tiny" className="flex-1 ml-2 text-slate-700 dark:text-slate-300">
                {statusMessage}
              </ThemedText>
            </View>
          )}

          {/* Success Animation */}
          {state === 'success' && (
            <View className="items-center py-6">
              <Animated.View>
                <Ionicons name="checkmark-circle" size={80} color="#10b981" />
              </Animated.View>
              <ThemedText variant="subheading" className="text-emerald-600 dark:text-emerald-400 mt-3 font-bold">
                Attendance Confirmed!
              </ThemedText>
              <ThemedText variant="body" className="text-slate-600 dark:text-slate-300 mt-1 text-center">
                You have been marked present for this session.
              </ThemedText>
            </View>
          )}

          {/* Error Animation */}
          {state === 'error' && (
            <View className="items-center py-4">
              <Ionicons name="close-circle" size={60} color="#ef4444" />
            </View>
          )}

          {/* Action Button */}
          {state !== 'success' && (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Mark Present"
                disabled={checkedIn || unavailable || busy}
                onPress={handleCheckIn}
                className={`rounded-xl py-4 items-center ${
                  checkedIn 
                    ? 'bg-emerald-700' 
                    : unavailable 
                      ? 'bg-slate-400' 
                      : 'bg-emerald-600'
                }`}
              >
                {busy ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#fff" />
                    <ThemedText variant="body" className="text-white font-semibold ml-2">
                      {state === 'searching' ? 'Searching…' : 'Verifying…'}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText variant="body" className="text-white font-semibold">
                    {checkedIn 
                      ? 'You are marked present' 
                      : unavailable 
                        ? 'Session ended' 
                        : state === 'not-found' || state === 'error' 
                          ? 'Try again' 
                          : 'Mark Present'}
                  </ThemedText>
                )}
              </TouchableOpacity>

              {/* Manual Check-in Fallback */}
              {(state === 'not-found' || state === 'error') && onManualCheckIn && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Mark Present Manually"
                  onPress={handleManualCheckIn}
                  className="mt-3 rounded-xl py-3 items-center bg-slate-200 dark:bg-slate-700"
                >
                  <ThemedText variant="body" className="text-slate-700 dark:text-slate-300 font-semibold">
                    Mark Present Manually
                  </ThemedText>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Close button for success state */}
          {state === 'success' && (
            <TouchableOpacity
              onPress={hideModal}
              className="mt-4 rounded-xl py-3 items-center bg-slate-200 dark:bg-slate-700"
            >
              <ThemedText variant="body" className="text-slate-700 dark:text-slate-300 font-semibold">
                Close
              </ThemedText>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
