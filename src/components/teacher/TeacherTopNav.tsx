import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/ui/AppText';
import { CircleButton } from '@/ui/CircleButton';
import { BrandLockup } from '@/ui/brand/BrandLockup';
import { HeroBackdrop } from '@/ui/brand/HeroBackdrop';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';
import { showToast } from '@/ui/Toast';

/**
 * Workspace header for the teacher area: the same violet gradient + proximity
 * rings as sign-in/discover, carrying the brand lockup, the notification bell
 * and the profile shortcut. It renders under the status bar, so the layout
 * keeps the status-bar icons light while it is on screen.
 */
export function TeacherTopNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const openProfile = () => {
    haptics.light();
    router.push('/(student)/profile');
  };

  return (
    <LinearGradient
      colors={colors.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + 10,
        paddingBottom: 14,
        paddingHorizontal: 18,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
      }}
    >
      <HeroBackdrop topInset={insets.top} visibleHeight={96} bottomClearance={8} variant="tab" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BrandLockup tone="hero" markSize={30} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleButton
            variant="glass"
            size={40}
            icon="notifications-outline"
            accessibilityLabel="Notifications"
            onPress={() => {
              haptics.light();
              showToast.info('Notifications', 'The teacher notification center will be available with its backend endpoint.');
            }}
          />
          <Pressable
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.45)',
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            {user?.profile_image_url ? (
              <Image
                source={{ uri: user.profile_image_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                accessibilityLabel={`${user.full_name || 'User'} profile photo`}
              />
            ) : (
              <AppText weight="bold" tone="hero" style={{ fontSize: 13 }}>
                {initialsFromName(user?.full_name || 'Campusly')}
              </AppText>
            )}
          </Pressable>
          <Ionicons name="school-outline" size={0} color="transparent" accessibilityElementsHidden />
        </View>
      </View>
    </LinearGradient>
  );
}
