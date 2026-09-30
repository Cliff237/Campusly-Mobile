import { Alert, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import type { AttendanceStatus, StudentAttendanceRecord } from '@/lib/types/student';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present ✅',
  absent: 'Absent ❌',
  late: 'Late ⏰',
  excused: 'Excused 📋',
};

interface AttendanceHistoryProps {
  records: StudentAttendanceRecord[];
  onRequestExcuse?: (record: StudentAttendanceRecord) => void;
}

export function AttendanceHistory({ records, onRequestExcuse }: AttendanceHistoryProps) {
  return (
    <View className="px-5 pb-8">
      {records.map((record) => (
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
          className="py-3 border-b border-border dark:border-border-dark"
        >
          <View className="flex-row justify-between">
            <ThemedText variant="body" className="font-semibold">{record.course_name}</ThemedText>
            <ThemedText variant="caption">{STATUS_LABEL[record.status]}</ThemedText>
          </View>
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">
            {new Date(record.date).toLocaleDateString()}
            {record.time ? ` · ${record.time}` : ''}
            {record.penalty ? ` · Penalty -${record.penalty}` : ''}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}
