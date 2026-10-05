import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { AppText } from '@/ui/AppText';
import { StatsCards } from '@/components/student/marks/StatsCards';
import { AchievementsRow } from '@/components/student/marks/AchievementsRow';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';
import { href } from '@/lib/href';

const THEMES = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' as const },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' as const },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' as const },
] as const;

export default function StudentProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const bottomOffset = useBottomTabOffset(36);
  const { user, currentMembership, memberships, logout, selectInstitution, clearSelectedInstitution, getDashboardRoute } =
    useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();
  const initials = initialsFromName(user?.full_name || 'Campusly');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: bottomOffset, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Profile Header Identity Card ─── */}
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 20,
          borderRadius: 28,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 24,
          alignItems: 'center',
          elevation: 2,
          shadowColor: '#170F2E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 10,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.brandSoft,
            borderWidth: 2,
            borderColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <AppText variant="display" weight="extrabold" tone="brand">
            {initials}
          </AppText>
        </View>

        <AppText variant="heading" weight="extrabold" style={{ textAlign: 'center' }}>
          {user?.full_name}
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
          @{user?.username}
        </AppText>

        {user?.email ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {user.email}
          </AppText>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="school-outline" size={15} color={colors.brand} />
          <AppText variant="caption" weight="semibold" tone="brand">
            {currentMembership?.institution_name || 'Academic Institution'}
          </AppText>
        </View>
      </View>

      {/* ─── Quick Academic Metrics ─── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AppText variant="subheading" weight="bold">
          Academic Overview
        </AppText>
      </View>
      <StatsCards stats={{}} />

      {/* ─── Achievements ─── */}
      <AchievementsRow badges={[]} />

      {/* ─── Appearance / Theme Section ─── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AppText variant="subheading" weight="bold">
          Display Theme
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
        {THEMES.map((theme) => {
          const active = (colorScheme ?? 'system') === theme.id;
          return (
            <TouchableOpacity
              key={theme.id}
              accessibilityRole="button"
              accessibilityLabel={`Theme ${theme.label}`}
              onPress={() => {
                haptics.selection();
                setColorScheme(theme.id);
              }}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 18,
                backgroundColor: active ? colors.brand : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.brand : colors.border,
                alignItems: 'center',
                gap: 6,
                elevation: active ? 2 : 0,
              }}
            >
              <Ionicons
                name={theme.icon}
                size={18}
                color={active ? '#FFFFFF' : colors.textMuted}
              />
              <AppText
                variant="caption"
                weight={active ? 'bold' : 'medium'}
                style={{ color: active ? '#FFFFFF' : colors.text }}
              >
                {theme.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Account Settings Links ─── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AppText variant="subheading" weight="bold">
          Account Settings
        </AppText>
      </View>

      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 24,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            haptics.light();
            router.push(href('/(tabs)/profile'));
          }}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-outline" size={18} color={colors.brand} />
            </View>
            <View>
              <AppText variant="body" weight="semibold">
                Edit Personal Profile
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                Name, username and phone number
              </AppText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </TouchableOpacity>

        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.brand} />
            </View>
            <View>
              <AppText variant="body" weight="semibold">
                Classroom Alerts
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                Push alerts enabled for attendance check-ins
              </AppText>
            </View>
          </View>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
        </View>
      </View>

      {/* ─── Switch Institution Section ─── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AppText variant="subheading" weight="bold">
          Enrolled Institutions
        </AppText>
      </View>

      {memberships
        .filter((item) => item.status === 'active')
        .map((membership) => {
          const isSelected = membership.membership_id === currentMembership?.membership_id;
          return (
            <TouchableOpacity
              key={membership.membership_id}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${membership.institution_name}`}
              onPress={async () => {
                if (isSelected) return;
                haptics.medium();
                await selectInstitution(membership.institution_id, membership.membership_id);
                router.replace(href(getDashboardRoute(membership.base_actor)));
              }}
              activeOpacity={0.8}
              style={{
                marginHorizontal: 20,
                marginBottom: 10,
                borderRadius: 18,
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.brand : colors.border,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: isSelected ? colors.brandSoft : colors.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={isSelected ? colors.brand : colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="bold" numberOfLines={1}>
                    {membership.institution_name}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ textTransform: 'capitalize', marginTop: 2 }}>
                    {membership.base_actor}
                  </AppText>
                </View>
              </View>

              {isSelected ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: colors.brandSoft,
                  }}
                >
                  <AppText variant="caption" weight="bold" tone="brand">
                    Active
                  </AppText>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
              )}
            </TouchableOpacity>
          );
        })}

      {/* ─── Back to Discover ─── */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to Discover"
        onPress={() => {
          haptics.light();
          void clearSelectedInstitution();
          router.replace('/(tabs)/discover');
        }}
        activeOpacity={0.8}
        style={{
          marginHorizontal: 20,
          marginTop: 10,
          borderRadius: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <AppText variant="body" weight="semibold">
          Back to Discover
        </AppText>
      </TouchableOpacity>

      {/* ─── Logout ─── */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => {
          haptics.warning();
          void logout();
          router.replace('/(auth)');
        }}
        activeOpacity={0.8}
        style={{
          marginHorizontal: 20,
          marginTop: 10,
          borderRadius: 18,
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FCA5A5',
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#DC2626" />
        <AppText variant="body" weight="bold" style={{ color: '#DC2626' }}>
          Log Out
        </AppText>
      </TouchableOpacity>
    </ScrollView>
  );
}
