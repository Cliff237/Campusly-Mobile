import { Alert, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { haptics } from '@/lib/haptics';
import type { StudentAttendanceRecord } from '@/lib/types/student';

interface AbsenceListProps {
  records: StudentAttendanceRecord[];
}

export function AbsenceList({ records }: AbsenceListProps) {
  const absences = records.filter((record) => record.status === 'absent' || record.status === 'excused');

  if (absences.length === 0) {
    return (
      <EmptyStateAnimation
        icon="happy-outline"
        title="No absences"
        subtitle="Unexcused absences and excuse requests will show here"
      />
    );
  }

  return (
    <View className="px-5 mb-4">
      <ThemedText variant="subheading" className="mb-2">Absences</ThemedText>
      {absences.map((record) => (
        <TouchableOpacity
          key={record.id}
          accessibilityRole="button"
          accessibilityLabel={`${record.course_name} absence`}
          onPress={() => {
            if (record.status !== 'absent') return;
            haptics.light();
            Alert.alert('Request excuse', 'Excuse requests will be available when the backend endpoint is added.');
          }}
          className="py-3 border-b border-border dark:border-border-dark"
        >
          <ThemedText variant="body" className="font-semibold">{record.course_name}</ThemedText>
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">
            {new Date(record.date).toLocaleDateString()} · {record.status}
            {record.penalty ? ` · -${record.penalty}` : ''}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}
