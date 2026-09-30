import { ScrollView, View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import type { TodayGlanceItem } from '@/lib/types/student';

interface TodayStripProps {
  items: TodayGlanceItem[];
}

export function TodayStrip({ items }: TodayStripProps) {
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      className="mb-3"
    >
      {items.map((item) => (
        <View
          key={item.id}
          className="px-3 py-2 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark"
        >
          <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">
            {item.label}
          </ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}
