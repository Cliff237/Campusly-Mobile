import { ScrollView, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { formatDayLabel } from '@/lib/format';
import { haptics } from '@/lib/haptics';

interface WeekSelectorProps {
  selected: Date;
  onSelect: (date: Date) => void;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function WeekSelector({ selected, onSelect }: WeekSelectorProps) {
  const start = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      className="mb-4"
    >
      {days.map((date) => {
        const active = date.toDateString() === selected.toDateString();
        return (
          <TouchableOpacity
            key={date.toISOString()}
            accessibilityRole="button"
            accessibilityLabel={date.toDateString()}
            onPress={() => {
              haptics.selection();
              onSelect(date);
            }}
            className={`w-14 py-3 rounded-2xl items-center border ${
              active
                ? 'bg-accent-start border-accent-start'
                : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
            }`}
          >
            <ThemedText variant="tiny" className={active ? 'text-white' : 'text-text-muted dark:text-text-muted-dark'}>
              {formatDayLabel(date)}
            </ThemedText>
            <ThemedText variant="subheading" className={active ? 'text-white' : 'text-text dark:text-text-dark'}>
              {date.getDate()}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
