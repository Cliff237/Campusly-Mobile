import { memo } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import type { StudentFeedFilter } from '@/lib/types/student';

const FILTERS: { id: StudentFeedFilter; label: string }[] = [
  { id: 'institution', label: 'Institution' },
];

interface FeedFiltersProps {
  value: StudentFeedFilter;
  onChange: (value: StudentFeedFilter) => void;
}

export const FeedFilters = memo(function FeedFilters({ value, onChange }: FeedFiltersProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={{ backgroundColor: isDark ? '#242526' : '#ffffff', paddingBottom: 10, marginBottom: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {FILTERS.map((filter) => {
          const active = filter.id === value;
          return (
            <TouchableOpacity
              key={filter.id}
              accessibilityRole="button"
              accessibilityLabel={filter.label}
              onPress={() => {
                haptics.selection();
                onChange(filter.id);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: active ? '#1877f2' : isDark ? '#3a3b3c' : '#e4e6eb',
              }}
            >
              <ThemedText
                variant="caption"
                style={{ color: active ? '#ffffff' : isDark ? '#e4e6eb' : '#050505', fontWeight: '700' }}
              >
                {filter.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});
