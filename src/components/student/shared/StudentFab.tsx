import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';

interface StudentFabProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  offset?: number;
}

export function StudentFab({ icon, label, onPress, offset = 24 }: StudentFabProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.85}
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      className="absolute right-5 rounded-full bg-accent-start px-4 py-3 flex-row items-center gap-2"
      style={{ bottom: offset, shadowColor: '#4f46e5', shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 }}
    >
      <View className="w-6 h-6 items-center justify-center">
        <Ionicons name={icon} size={20} color="#ffffff" />
      </View>
      <ThemedText variant="caption" className="text-white font-semibold">
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}
