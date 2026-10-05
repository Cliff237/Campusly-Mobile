import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import type { AchievementBadge } from '@/lib/types/student';

interface AchievementsRowProps {
  badges: AchievementBadge[];
}

export function AchievementsRow({ badges }: AchievementsRowProps) {
  const { colors, isDark } = useAppTheme();

  if (badges.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AppText variant="subheading" weight="bold">
          Academic Honors & Milestones
        </AppText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {badges.map((badge) => (
          <View
            key={badge.id}
            style={{
              width: 170,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              opacity: badge.earned ? 1 : 0.6,
              elevation: badge.earned ? 2 : 0,
              shadowColor: '#170F2E',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 6,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: badge.earned ? 'rgba(124, 58, 237, 0.14)' : colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Ionicons
                name={badge.earned ? 'trophy' : 'lock-closed-outline'}
                size={22}
                color={badge.earned ? '#7C3AED' : colors.textMuted}
              />
            </View>

            <AppText variant="caption" weight="bold">
              {badge.title}
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4, lineHeight: 16 }}>
              {badge.description}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
