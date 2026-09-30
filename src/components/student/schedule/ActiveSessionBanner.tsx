import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { formatRemaining } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { ActiveAttendanceSession } from '@/lib/types/attendance';

interface ActiveSessionBannerProps {
  session: ActiveAttendanceSession;
  onMarkPresent: () => void;
  state?: 'idle' | 'permission' | 'searching' | 'verifying' | 'not-found' | 'success' | 'expired' | 'error';
  message?: string;
}

export function ActiveSessionBanner({ session, onMarkPresent, state = 'idle', message }: ActiveSessionBannerProps) {
  const remaining = session.remaining_seconds ?? 0;
  const checkedIn = session.is_checked_in || state === 'success';
  const busy = state === 'searching' || state === 'verifying';
  const unavailable = state === 'expired';

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
    <View className="mx-5 mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <ThemedText variant="caption" className="text-emerald-600 font-semibold mb-1">
        Attendance session active
      </ThemedText>
      <ThemedText variant="subheading">📚 {session.course_name}</ThemedText>
      <ThemedText variant="caption" className="mt-1">⏱️ {formatRemaining(remaining)} remaining</ThemedText>
      {session.penalty_label ? (
        <ThemedText variant="tiny" className="text-amber-600 mt-1">⚠️ {session.penalty_label}</ThemedText>
      ) : null}
      {statusMessage ? <View className="mt-3 flex-row items-start rounded-xl bg-surface/70 dark:bg-bg-dark p-3"><Ionicons name={state === 'not-found' || state === 'error' ? 'warning-outline' : 'bluetooth-outline'} size={18} color={state === 'not-found' || state === 'error' ? '#d97706' : '#0f766e'} /><ThemedText variant="tiny" className="flex-1 ml-2">{statusMessage}</ThemedText></View> : null}
      <PermissionGate permission="mark_attendance">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="I'm present"
          disabled={checkedIn || unavailable || busy}
          onPress={() => {
            haptics.success();
            onMarkPresent();
          }}
          className={`mt-3 rounded-xl py-3 items-center ${checkedIn ? 'bg-emerald-700' : unavailable ? 'bg-slate-400' : 'bg-emerald-600'}`}
        >
          {busy ? <View className="flex-row items-center"><ActivityIndicator size="small" color="#fff" /><ThemedText variant="body" className="text-white font-semibold ml-2">{state === 'searching' ? 'Searching…' : 'Verifying…'}</ThemedText></View> : <ThemedText variant="body" className="text-white font-semibold">{checkedIn ? 'You are marked present' : unavailable ? 'Session ended' : state === 'not-found' || state === 'error' ? 'Try again' : "Mark Present"}</ThemedText>}
        </TouchableOpacity>
      </PermissionGate>
    </View>
  );
}
