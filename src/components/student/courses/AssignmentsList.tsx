import { View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import type { CourseAssignment } from '@/lib/types/student';

const STATUS_STYLES: Record<CourseAssignment['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-600',
  submitted: 'bg-blue-500/15 text-blue-600',
  graded: 'bg-emerald-500/15 text-emerald-600',
  overdue: 'bg-red-500/15 text-red-600',
};

interface AssignmentsListProps {
  items: CourseAssignment[];
}

export function AssignmentsList({ items }: AssignmentsListProps) {
  if (items.length === 0) {
    return (
      <EmptyStateAnimation
        icon="create-outline"
        title="No assignments"
        subtitle="When assignments are posted they will appear here"
      />
    );
  }

  return (
    <View className="px-5 pb-8">
      {items.map((item) => (
        <View key={item.id} className="mb-3 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4">
          <View className="flex-row items-center justify-between">
            <ThemedText variant="body" className="font-semibold flex-1 pr-2">{item.title}</ThemedText>
            <View className={`px-2 py-1 rounded-full ${STATUS_STYLES[item.status].split(' ')[0]}`}>
              <ThemedText variant="tiny" className="capitalize font-semibold">{item.status}</ThemedText>
            </View>
          </View>
          <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1">
            Due {new Date(item.due_date).toLocaleDateString()}
            {typeof item.score === 'number' ? ` · ${item.score}/${item.max_score}` : ''}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}
