import { useEffect } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';

interface EmptyStateAnimationProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export function EmptyStateAnimation({ icon, title, subtitle }: EmptyStateAnimationProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [float]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <View className="items-center justify-center px-8 py-16">
      <Animated.View
        style={iconStyle}
        className="w-20 h-20 rounded-3xl bg-accent-start/10 items-center justify-center mb-5"
      >
        <Ionicons name={icon} size={36} color="#4f46e5" />
      </Animated.View>
      <ThemedText variant="heading" className="text-center text-text dark:text-text-dark mb-2">{title}</ThemedText>
      <ThemedText variant="muted" className="text-center" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
        {subtitle}
      </ThemedText>
    </View>
  );
}
