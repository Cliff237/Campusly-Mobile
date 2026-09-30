import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { StatsCards } from '@/components/student/marks/StatsCards';
import { AchievementsRow } from '@/components/student/marks/AchievementsRow';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';
import { href } from '@/lib/href';

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
] as const;

export default function StudentProfileScreen() {
  const router = useRouter();
  const { user, currentMembership, memberships, logout, selectInstitution, clearSelectedInstitution, getDashboardRoute } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();
  const initials = initialsFromName(user?.full_name || 'Campusly');

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="items-center px-5 pt-6 pb-4">
        <View className="w-20 h-20 rounded-full bg-accent-start/15 items-center justify-center mb-3">
          <ThemedText variant="heading" className="text-accent-start">{initials}</ThemedText>
        </View>
        <ThemedText variant="heading">{user?.full_name}</ThemedText>
        <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">@{user?.username}</ThemedText>
        {user?.email ? (
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">{user.email}</ThemedText>
        ) : null}
        <ThemedText variant="caption" className="mt-2">{currentMembership?.institution_name}</ThemedText>
      </View>

      <ThemedText variant="subheading" className="px-5 mb-2">Academic overview</ThemedText>
      <StatsCards stats={{}} />

      <ThemedText variant="subheading" className="px-5 mb-2">Absence summary</ThemedText>
      <ThemedText variant="muted" className="px-5 mb-4">Absence totals will appear when the student absences API is available.</ThemedText>

      <AchievementsRow badges={[]} />

      <ThemedText variant="subheading" className="px-5 mb-2">Theme</ThemedText>
      <View className="flex-row px-5 gap-2 mb-6">
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
              className={`flex-1 py-3 rounded-xl border items-center ${
                active ? 'bg-accent-start border-accent-start' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
              }`}
            >
              <ThemedText variant="caption" className={active ? 'text-white font-semibold' : ''}>{theme.label}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ThemedText variant="subheading" className="px-5 mb-2">Account</ThemedText>
      <View className="mx-5 mb-6 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
        <View className="px-4 py-3 border-b border-border dark:border-border-dark">
          <ThemedText variant="body">Change password</ThemedText>
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Available from the web account settings for now</ThemedText>
        </View>
        <View className="px-4 py-3">
          <ThemedText variant="body">Notifications</ThemedText>
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Push registration will appear after the device API exists</ThemedText>
        </View>
      </View>

      <ThemedText variant="subheading" className="px-5 mb-2">Switch institution</ThemedText>
      {memberships.filter((item) => item.status === 'active').map((membership) => (
        <TouchableOpacity
          key={membership.membership_id}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${membership.institution_name}`}
          onPress={async () => {
            haptics.light();
            await selectInstitution(membership.institution_id, membership.membership_id);
            router.replace(href(getDashboardRoute(membership.base_actor)));
          }}
          className="mx-5 mb-2 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-4 py-3"
        >
          <ThemedText variant="body" className="font-semibold">{membership.institution_name}</ThemedText>
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark capitalize">{membership.base_actor}</ThemedText>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to Discover"
        onPress={() => {
          haptics.light();
          void clearSelectedInstitution();
          router.replace('/(tabs)/discover');
        }}
        className="mx-5 mt-4 rounded-xl bg-surface dark:bg-surface-dark px-4 py-3 items-center"
      >
        <ThemedText variant="body" className="font-semibold">Back to Discover</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => {
          haptics.warning();
          void logout();
          router.replace('/(auth)');
        }}
        className="mx-5 mt-3 rounded-xl bg-red-500/10 px-4 py-3 items-center"
      >
        <ThemedText variant="body" className="text-red-500 font-semibold">Log out</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}
