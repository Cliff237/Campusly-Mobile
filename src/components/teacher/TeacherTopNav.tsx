import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';
import { showToast } from '@/ui/Toast';

export function TeacherTopNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return <View className="flex-row items-center justify-between px-5 py-3 bg-bg dark:bg-bg-dark border-b border-border dark:border-border-dark">
    <ThemedText variant="heading" className="font-display">Campusly</ThemedText>
    <View className="flex-row gap-3">
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => { haptics.light(); showToast.info('Notifications', 'The teacher notification center will be available with its backend endpoint.'); }} className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark items-center justify-center">
        <Ionicons name="notifications-outline" size={20} color={dark ? '#f7f5ff' : '#201d2e'} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Profile" onPress={() => { haptics.light(); router.push('/(student)/profile'); }} className="w-10 h-10 rounded-full bg-primary-soft items-center justify-center overflow-hidden">
        {user?.profile_image_url ? (
          <Image
            source={{ uri: user.profile_image_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            accessibilityLabel={`${user.full_name || 'User'} profile photo`}
          />
        ) : (
          <ThemedText variant="caption" className="text-primary font-bold">{initialsFromName(user?.full_name || 'Campusly')}</ThemedText>
        )}
      </TouchableOpacity>
    </View>
  </View>;
}
