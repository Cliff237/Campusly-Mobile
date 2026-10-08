import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { AppText } from '@/ui/AppText';
import { BrandLockup } from '@/ui/brand/BrandLockup';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';

import { InstitutionMark } from '@/ui/InstitutionMark';

interface TopNavProps {
  unreadCount?: number;
}

export function TopNav({ unreadCount = 0 }: TopNavProps) {
  const router = useRouter();
  const { currentMembership, selectedInstitutionId } = useAuth();
  const { colors } = useAppTheme();
  const institutionId = currentMembership?.institution_id || selectedInstitutionId;
  const institutionName = currentMembership?.institution_name || 'Institution';

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
            router.push(href('/(student)/notifications'));
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
          {unreadCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                minWidth: 18,
                height: 18,
                paddingHorizontal: 4,
                borderRadius: 9,
                backgroundColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.surface,
              }}
            >
              <AppText variant="overline" color="#ffffff" style={{ fontSize: 9 }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </AppText>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Selected Institution Profile Button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${institutionName} Profile`}
          onPress={() => {
            haptics.light();
            if (institutionId) {
              router.push(href(`/institution/${institutionId}`));
            }
          }}
          activeOpacity={0.75}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: currentMembership?.institution_brand_color || colors.brand,
            overflow: 'hidden',
          }}
        >
          <InstitutionMark
            name={institutionName}
            logoUrl={currentMembership?.institution_logo_url}
            color={currentMembership?.institution_brand_color}
            size={37}
            radius={18.5}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
