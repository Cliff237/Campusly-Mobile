import { Alert, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import type { AttendanceStatus, StudentAttendanceRecord } from '@/lib/types/student';

const STATUS_META: Record<AttendanceStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  present: { label: 'Present', icon: 'checkmark-circle', tint: '#25855F' },
  absent: { label: 'Absent', icon: 'close-circle', tint: '#C2415F' },
  late: { label: 'Late', icon: 'time', tint: '#D97706' },
  excused: { label: 'Excused', icon: 'document-text', tint: '#3974B8' },
};

interface AttendanceHistoryProps {
  records: StudentAttendanceRecord[];
  onRequestExcuse?: (record: StudentAttendanceRecord) => void;
}

export function AttendanceHistory({ records, onRequestExcuse }: AttendanceHistoryProps) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
      {records.map((record) => {
        const meta = STATUS_META[record.status];
        return (
          <TouchableOpacity
            key={record.id}
            accessibilityRole="button"
            accessibilityLabel={`${record.course_name} ${record.status}`}
            onPress={() => {
              if (record.status !== 'absent' || !onRequestExcuse) return;
              haptics.light();
              Alert.alert('Request excuse', 'Submit a reason for this absence?', [
                { text: 'Request excuse', onPress: () => onRequestExcuse(record) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? colors.surfaceMuted : `${meta.tint}1A`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={meta.icon} size={17} color={meta.tint} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="label" weight="bold" numberOfLines={1}>{record.course_name}</AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {new Date(record.date).toLocaleDateString()}
                {record.time ? ` · ${record.time}` : ''}
                {record.penalty ? ` · Penalty -${record.penalty}` : ''}
              </AppText>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: isDark ? colors.surfaceMuted : `${meta.tint}14` }}>
              <AppText variant="caption" weight="bold" color={meta.tint} style={{ fontSize: 11, lineHeight: 14 }}>{meta.label}</AppText>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
