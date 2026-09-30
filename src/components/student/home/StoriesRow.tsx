import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import { initialsFromName } from '@/lib/format';
import type { StoryItem } from '@/lib/types/student';

interface StoriesRowProps {
  items: StoryItem[];
  onPress: (item: StoryItem) => void;
}

export function StoriesRow({ items, onPress }: StoriesRowProps) {
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
      className="mb-4"
    >
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          activeOpacity={0.8}
          onPress={() => {
            haptics.light();
            onPress(item);
          }}
          className="items-center"
          style={{ width: 68 }}
        >
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ borderWidth: 2, borderColor: item.kind === 'institution' ? '#7c3aed' : '#4f46e5' }}
          >
            <View className="w-[54px] h-[54px] rounded-full overflow-hidden bg-surface-hover dark:bg-surface-hover-dark items-center justify-center">
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <ThemedText variant="body" className="font-semibold text-text dark:text-text-dark">
                  {initialsFromName(item.label)}
                </ThemedText>
              )}
            </View>
          </View>
          <ThemedText variant="tiny" className="text-center mt-1.5 text-text dark:text-text-dark" numberOfLines={1}>
            {item.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
