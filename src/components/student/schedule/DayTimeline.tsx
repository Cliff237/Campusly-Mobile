import { View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';

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
  if (events.length === 0) {
    return (
      <EmptyStateAnimation
        icon="calendar-outline"
        title="No classes scheduled"
        subtitle="Your timetable for this day will appear here"
      />
    );
  }

  return (
    <View className="px-5 mb-4">
      {HOURS.map((hour) => {
        const block = events.find((event) => event.startHour === hour);
        return (
          <View key={hour} className="flex-row min-h-[56px]">
            <ThemedText variant="tiny" className="w-12 text-text-muted dark:text-text-muted-dark pt-1">
              {hour}:00
            </ThemedText>
            <View className="flex-1 border-t border-border dark:border-border-dark pt-1">
              {block ? (
                <View className="rounded-xl px-3 py-2" style={{ backgroundColor: `${block.color}22` }}>
                  <ThemedText variant="caption" className="font-semibold">{block.title}</ThemedText>
                  <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">{block.subtitle}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
