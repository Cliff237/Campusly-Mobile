import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AppText } from '@/ui/AppText';
import { BrandLockup } from '@/ui/brand/BrandLockup';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';
import { showToast } from '@/ui/Toast';

export function TeacherTopNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <BrandLockup tone="default" markSize={32} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => {
            haptics.light();
            showToast.info('Notifications', 'The teacher notification center will be available soon.');
          }}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => {
            haptics.light();
            router.push('/(tabs)/profile');
          }}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.brand,
            overflow: 'hidden',
          }}
        >
          {user?.profile_image_url ? (
            <Image
              source={{ uri: user.profile_image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              accessibilityLabel={`${user.full_name || 'User'} profile photo`}
            />
          ) : (
            <AppText variant="label" weight="bold" tone="brand">
              {initialsFromName(user?.full_name || 'Campusly')}
            </AppText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
