import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
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
  const { colors, shadow, isDark } = useAppTheme();
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
  const isError = state === 'not-found' || state === 'error';

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? colors.border : '#B7ECD9', backgroundColor: isDark ? colors.surface : '#EFFBF6', boxShadow: shadow.sm }}>
      {/* Header strip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#25855F' }} />
        <AppText variant="caption" weight="bold" color={isDark ? '#6EE7B7' : '#1E6E50'} style={{ letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 11, lineHeight: 14 }}>
          Attendance session active
        </AppText>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? colors.surfaceMuted : '#FFFFFF', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
          <Ionicons name="time-outline" size={12} color="#25855F" />
          <AppText variant="caption" weight="bold" color="#25855F" style={{ fontSize: 11.5, lineHeight: 14 }}>{formatRemaining(remaining)}</AppText>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: isDark ? colors.surfaceMuted : '#D7F5EA', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="school" size={18} color="#25855F" />
          </View>
          <AppText weight="bold" numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>{session.course_name}</AppText>
        </View>
        {session.penalty_label ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: isDark ? colors.surfaceMuted : '#FEF6E7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 }}>
            <Ionicons name="warning-outline" size={14} color="#D97706" />
            <AppText variant="caption" weight="semibold" color="#D97706" numberOfLines={1} style={{ flex: 1 }}>{session.penalty_label}</AppText>
          </View>
        ) : null}
        {statusMessage ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, backgroundColor: isDark ? colors.surfaceMuted : '#FFFFFF', borderWidth: 1, borderColor: isError ? '#F3C9CF' : colors.border, padding: 11, marginTop: 11 }}>
            <Ionicons name={isError ? 'warning-outline' : 'bluetooth-outline'} size={16} color={isError ? '#C2415F' : '#25855F'} style={{ marginTop: 1 }} />
            <AppText variant="caption" tone={isError ? 'secondary' : 'secondary'} style={{ flex: 1, marginLeft: 8, lineHeight: 17 }}>{statusMessage}</AppText>
          </View>
        ) : null}
        <PermissionGate permission="mark_attendance">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="I'm present"
            disabled={checkedIn || unavailable || busy}
            onPress={() => {
              haptics.success();
              onMarkPresent();
            }}
            style={{ marginTop: 13, borderRadius: 16, overflow: 'hidden', opacity: unavailable ? 0.65 : 1 }}
          >
            <LinearGradient
              colors={checkedIn ? ['#25855F', '#1E6E50'] : unavailable ? ['#94A3B8', '#64748B'] : ['#34D399', '#25855F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}
            >
              {busy ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <AppText weight="bold" color="#FFFFFF">{state === 'searching' ? 'Searching…' : 'Verifying…'}</AppText>
                </>
              ) : (
                <>
                  <Ionicons name={checkedIn ? 'checkmark-circle' : isError ? 'refresh' : 'radio-outline'} size={17} color="#FFFFFF" />
                  <AppText weight="bold" color="#FFFFFF">{checkedIn ? 'You are marked present' : unavailable ? 'Session ended' : isError ? 'Try again' : 'Mark Present'}</AppText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </PermissionGate>
      </View>
    </Animated.View>
  );
}
