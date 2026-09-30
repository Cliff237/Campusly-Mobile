import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import type { AchievementBadge } from '@/lib/types/student';

interface AchievementsRowProps {
  badges: AchievementBadge[];
}

export function AchievementsRow({ badges }: AchievementsRowProps) {
  if (badges.length === 0) return null;

  return (
    <View className="mb-6">
      <ThemedText variant="subheading" className="px-5 mb-3">Achievements</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {badges.map((badge) => (
          <View
            key={badge.id}
            className={`w-40 rounded-2xl border p-4 ${
              badge.earned
                ? 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                : 'bg-surface-hover dark:bg-surface-hover-dark border-border dark:border-border-dark opacity-60'
            }`}
          >
            <Ionicons name={badge.earned ? 'trophy' : 'lock-closed-outline'} size={22} color={badge.earned ? '#7c3aed' : '#64748b'} />
            <ThemedText variant="caption" className="font-semibold mt-2">{badge.title}</ThemedText>
            <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">{badge.description}</ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
