import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';

export function ExplorerPrograms() {
  return (
    <Animated.View entering={FadeInDown.duration(350)} className="px-5 py-10">
      <View className="rounded-3xl bg-accent-start/10 dark:bg-accent-start/20 px-6 py-10 items-center">
        <View className="w-16 h-16 rounded-2xl bg-accent-start/15 items-center justify-center mb-4">
          <Ionicons name="library-outline" size={32} color="#4f46e5" />
        </View>
        <ThemedText variant="subheading" className="text-center text-text dark:text-text-dark mb-2">
          Programs coming soon
        </ThemedText>
        <ThemedText variant="muted" className="text-center">
          Course and program information will appear here when this institution publishes it.
        </ThemedText>
      </View>
    </Animated.View>
  );
}
