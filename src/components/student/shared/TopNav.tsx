import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';

interface TopNavProps {
  unreadCount?: number;
}

export function TopNav({ unreadCount = 0 }: TopNavProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const initials = initialsFromName(user?.full_name || 'Campusly');

  return (
    <View className="flex-row items-center justify-between px-5 py-3 bg-bg dark:bg-bg-dark border-b border-border dark:border-border-dark">
      <ThemedText variant="heading" className="font-display text-text dark:text-text-dark">
        Campusly
      </ThemedText>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => {
            haptics.light();
            router.push(href('/(student)/notifications'));
          }}
          className="w-10 h-10 rounded-full items-center justify-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark"
        >
          <Ionicons name="notifications-outline" size={20} color={isDark ? '#f8fafc' : '#0f172a'} />
          {unreadCount > 0 ? (
            <View className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent-start items-center justify-center">
              <ThemedText variant="tiny" className="text-white text-[10px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </ThemedText>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => {
            haptics.light();
            router.push(href('/(tabs)/profile'));
          }}
          className="w-10 h-10 rounded-full bg-accent-start/15 items-center justify-center border border-border dark:border-border-dark overflow-hidden"
        >
          {user?.profile_image_url ? (
            <Image
              source={{ uri: user.profile_image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              accessibilityLabel={`${user.full_name || 'User'} profile photo`}
            />
          ) : (
            <ThemedText variant="caption" className="text-accent-start font-semibold">
              {initials}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
