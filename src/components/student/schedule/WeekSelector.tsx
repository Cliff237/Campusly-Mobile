import { ScrollView, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
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
  const { colors, shadow } = useAppTheme();
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
      contentContainerStyle={{ paddingHorizontal: 20, gap: 9, paddingBottom: 16 }}
    >
      {days.map((date) => {
        const active = date.toDateString() === selected.toDateString();
        const today = date.toDateString() === new Date().toDateString();
        return (
          <TouchableOpacity
            key={date.toISOString()}
            accessibilityRole="button"
            accessibilityLabel={date.toDateString()}
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.selection();
              onSelect(date);
            }}
            style={{
              width: 56,
              paddingVertical: 12,
              borderRadius: 18,
              alignItems: 'center',
              backgroundColor: active ? colors.brand : colors.surface,
              borderWidth: 1,
              borderColor: active ? colors.brand : colors.border,
              boxShadow: active ? shadow.md : shadow.sm,
            }}
          >
            <AppText variant="caption" weight="bold" color={active ? '#DDD4FF' : colors.textMuted} style={{ fontSize: 11, lineHeight: 14 }}>
              {formatDayLabel(date)}
            </AppText>
            <AppText variant="subheading" color={active ? '#FFFFFF' : colors.text} style={{ marginTop: 2, fontSize: 17, lineHeight: 22 }}>
              {date.getDate()}
            </AppText>
            {today ? (
              <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 4, backgroundColor: active ? '#FBBF24' : colors.brand }} />
            ) : (
              <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 4, backgroundColor: 'transparent' }} />
            )}
          </TouchableOpacity>
        );
      })}
      <View style={{ width: 4 }} />
    </ScrollView>
  );
}
