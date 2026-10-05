import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import type { StudentStats } from '@/lib/types/student';

interface StatsCardsProps {
  stats: StudentStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { colors, isDark } = useAppTheme();

  const cards = [
    {
      label: 'Cumulative GPA',
      value: stats.gpa != null ? `${stats.gpa} / ${stats.gpa_max ?? 4}` : '—',
      icon: 'school-outline' as const,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Attendance Rate',
      value: stats.attendance_percent != null ? `${stats.attendance_percent}%` : '—',
      icon: 'radio-outline' as const,
      color: '#38BDF8',
      bg: 'rgba(56, 189, 248, 0.12)',
    },
    {
      label: 'Class Standing',
      value: stats.rank != null ? `${stats.rank} / ${stats.rank_total ?? '—'}` : '—',
      icon: 'trophy-outline' as const,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
    },
    {
      label: 'Total Credits',
      value: stats.credits != null ? `${stats.credits} / ${stats.credits_total ?? '—'}` : '—',
      icon: 'document-text-outline' as const,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      style={{ marginBottom: 20 }}
    >
      {cards.map((card) => (
        <View
          key={card.label}
          style={{
            width: 148,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            elevation: 1,
            shadowColor: '#170F2E',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 6,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: card.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Ionicons name={card.icon} size={18} color={card.color} />
          </View>

          <AppText variant="caption" tone="muted">
            {card.label}
          </AppText>
          <AppText variant="subheading" weight="extrabold" style={{ marginTop: 3 }}>
            {card.value}
          </AppText>
        </View>
      ))}
    </ScrollView>
  );
}
