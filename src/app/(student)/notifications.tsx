import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { relativeTime } from '@/lib/format';
import type { StudentNotification, StudentNotificationType } from '@/lib/types/student';

const TYPE_META: Record<StudentNotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  attendance: { icon: 'checkmark-circle', color: '#10b981' },
  post: { icon: 'document-text', color: '#3b82f6' },
  assignment: { icon: 'time', color: '#f59e0b' },
  grade: { icon: 'trophy', color: '#7c3aed' },
  system: { icon: 'information-circle', color: '#64748b' },
};

export default function StudentNotificationsScreen() {
  const items: StudentNotification[] = [];

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-bg dark:bg-bg-dark">
        <EmptyStateAnimation
          icon="notifications-outline"
          title="No notifications"
          subtitle="Attendance, posts, and grade alerts will land here"
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {items.map((item) => {
        const meta = TYPE_META[item.type];
        return (
          <View key={item.id} className="flex-row gap-3 mb-4">
            <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${meta.color}22` }}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View className="flex-1">
              <ThemedText variant="body" className="font-semibold">{item.title}</ThemedText>
              <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">{item.body}</ThemedText>
              <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">{relativeTime(item.created_at)}</ThemedText>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
