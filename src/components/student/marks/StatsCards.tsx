import { ScrollView, View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import type { StudentStats } from '@/lib/types/student';

interface StatsCardsProps {
  stats: StudentStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: 'GPA', value: stats.gpa != null ? `${stats.gpa} / ${stats.gpa_max ?? 4}` : '—' },
    { label: 'Attendance', value: stats.attendance_percent != null ? `${stats.attendance_percent}%` : '—' },
    { label: 'Rank', value: stats.rank != null ? `${stats.rank} / ${stats.rank_total ?? '—'}` : '—' },
    { label: 'Credits', value: stats.credits != null ? `${stats.credits} / ${stats.credits_total ?? '—'}` : '—' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      className="mb-4"
    >
      {cards.map((card) => (
        <View
          key={card.label}
          className="w-36 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4"
        >
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">{card.label}</ThemedText>
          <ThemedText variant="heading" className="mt-1">{card.value}</ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}
