import { View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import type { CourseGradeItem } from '@/lib/types/student';

interface CourseGradesProps {
  items: CourseGradeItem[];
  average?: number;
  attendancePenalty?: number;
  absenceCount?: number;
}

export function CourseGrades({ items, average, attendancePenalty, absenceCount }: CourseGradesProps) {
  if (items.length === 0) {
    return (
      <EmptyStateAnimation
        icon="ribbon-outline"
        title="No grades yet"
        subtitle="Approved marks for this class will show here"
      />
    );
  }

  return (
    <View className="px-5 pb-8">
      {items.map((item) => {
        const percent = item.max_score ? Math.round((item.score / item.max_score) * 100) : 0;
        return (
          <View key={item.id} className="mb-3">
            <View className="flex-row justify-between mb-1">
              <ThemedText variant="body">{item.assessment_name}</ThemedText>
              <ThemedText variant="caption">{item.score}/{item.max_score}</ThemedText>
            </View>
            {(item.raw_score != null || item.deduction != null) ? <View className="flex-row justify-between mt-1"><ThemedText variant="tiny">Raw {item.raw_score ?? item.score + (item.deduction ?? 0)}</ThemedText><ThemedText variant="tiny" className="text-berry">Deduction −{item.deduction ?? 0}</ThemedText></View> : null}
            <View className="h-1.5 rounded-full bg-surface-hover dark:bg-surface-hover-dark overflow-hidden mt-2">
              <View className="h-full bg-accent-start" style={{ width: `${percent}%` }} />
            </View>
          </View>
        );
      })}
      {typeof average === 'number' ? (
        <ThemedText variant="subheading" className="mt-4">Course average: {average}%</ThemedText>
      ) : null}
      {attendancePenalty ? (
        <ThemedText variant="caption" className="text-red-500 mt-2">
          Attendance Penalty: -{attendancePenalty} marks ({absenceCount ?? 0} absences)
        </ThemedText>
      ) : null}
    </View>
  );
}
