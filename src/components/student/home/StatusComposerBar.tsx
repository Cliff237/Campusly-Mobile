import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import { initialsFromName } from '@/lib/format';
import { useAuth } from '@/lib/auth/AuthContext';

interface StatusComposerBarProps {
  onPress: () => void;
}

export function StatusComposerBar({ onPress }: StatusComposerBarProps) {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? '#242526' : '#ffffff';
  const muted = isDark ? '#b0b3b8' : '#65676b';
  const border = isDark ? '#3a3b3c' : '#e4e6eb';
  const text = isDark ? '#e4e6eb' : '#050505';
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <View style={{ backgroundColor: surface, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#1877f2',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText variant="caption" style={{ color: '#ffffff', fontWeight: '700' }}>
            {initialsFromName(user?.full_name || 'You')}
          </ThemedText>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Create a post"
          onPress={() => {
            haptics.light();
            onPress();
          }}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 24,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: isDark ? '#3a3b3c' : '#f0f2f5',
          }}
        >
          <ThemedText variant="body" style={{ color: muted }}>
            What&apos;s on your mind, {firstName}?
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={{ height: 1, backgroundColor: border, marginVertical: 12 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {[
          { label: 'Photo', icon: 'image-outline' as const, color: '#45bd62' },
          { label: 'Event', icon: 'calendar-outline' as const, color: '#f7b928' },
          { label: 'Announce', icon: 'megaphone-outline' as const, color: '#1877f2' },
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            onPress={() => {
              haptics.light();
              onPress();
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8 }}
          >
            <Ionicons name={action.icon} size={18} color={action.color} />
            <ThemedText variant="caption" style={{ color: text, fontWeight: '600' }}>
              {action.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
