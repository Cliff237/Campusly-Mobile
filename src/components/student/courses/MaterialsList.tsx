import { TouchableOpacity, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { haptics } from '@/lib/haptics';
import type { CourseMaterial } from '@/lib/types/student';

interface MaterialsListProps {
  items: CourseMaterial[];
}

export function MaterialsList({ items }: MaterialsListProps) {
  if (items.length === 0) {
    return (
      <EmptyStateAnimation
        icon="folder-open-outline"
        title="No materials yet"
        subtitle="Files and slides will show up here when they are uploaded"
      />
    );
  }

  return (
    <View className="px-5 pb-8">
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.name}
          onPress={() => {
            haptics.light();
            if (item.id.startsWith('http')) void Linking.openURL(item.id);
          }}
          className="flex-row items-center gap-3 py-3 border-b border-border dark:border-border-dark"
        >
          <View className="w-10 h-10 rounded-xl bg-accent-start/10 items-center justify-center">
            <Ionicons name="document-text-outline" size={20} color="#4f46e5" />
          </View>
          <View className="flex-1">
            <ThemedText variant="body" className="font-semibold">{item.name}</ThemedText>
            <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">
              {item.size_label} · {item.date}
            </ThemedText>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
