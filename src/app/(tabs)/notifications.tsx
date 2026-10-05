import { View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { EmptyState } from '@/ui/EmptyState';
import { ScreenHero } from '@/ui/ScreenHero';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const bottomOffset = useBottomTabOffset(32);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScreenHero
        eyebrow="Notifications"
        title="Alerts"
        subtitle="Stay updated with campus news and announcements."
      />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: bottomOffset }}
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
