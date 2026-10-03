import { View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';

export interface TimelineEvent {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  subtitle: string;
  color: string;
}

interface DayTimelineProps {
  events: TimelineEvent[];
}

const HOURS = Array.from({ length: 11 }, (_, index) => index + 8);

export function DayTimeline({ events }: DayTimelineProps) {
  const { colors, isDark } = useAppTheme();
  if (events.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No classes scheduled"
        message="Your timetable for this day will appear here"
      />
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      {HOURS.map((hour) => {
        const block = events.find((event) => event.startHour === hour);
        return (
          <View key={hour} style={{ flexDirection: 'row', minHeight: 58 }}>
            <AppText variant="caption" tone="muted" weight="semibold" style={{ width: 48, paddingTop: 4, fontSize: 11.5, lineHeight: 15 }}>
              {hour}:00
            </AppText>
            <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5, paddingLeft: 4 }}>
              {block ? (
                <View
                  style={{
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    backgroundColor: isDark ? colors.surface : `${block.color}17`,
                    borderLeftWidth: 3,
                    borderLeftColor: block.color,
                  }}
                >
                  <AppText variant="label" weight="bold" numberOfLines={1}>{block.title}</AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>{block.subtitle}</AppText>
                </View>
              ) : (
                <View style={{ height: 10 }} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
