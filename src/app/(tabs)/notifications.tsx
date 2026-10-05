import { View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { EmptyState } from '@/ui/EmptyState';
import { ScreenHero } from '@/ui/ScreenHero';
import { useAppTheme } from '@/ui/useAppTheme';

export default function NotificationsScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScreenHero
        eyebrow="Notifications"
        title="Alerts"
        subtitle="Stay updated with campus news and announcements."
      />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          icon="notifications-outline"
          title="No alerts right now"
          message="Your campus broadcasts, attendance notices, and message alerts will appear here."
        />
      </ScrollView>
    </View>
  );
}
