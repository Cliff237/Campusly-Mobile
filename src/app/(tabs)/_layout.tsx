import { Tabs } from 'expo-router';
import { tabIcon, useTabBarOptions } from '@/ui/tabBarOptions';
import { useModalsOpen } from '@/ui/modalStore';

export default function TabLayout() {
  const options = useTabBarOptions();
  const modalsOpen = useModalsOpen();

  return (
    <Tabs
      screenOptions={{
        ...options,
        // The bottom nav never peeks out from behind a modal / sheet.
        tabBarStyle: modalsOpen ? { ...options.tabBarStyle, display: 'none' } : options.tabBarStyle,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: tabIcon('compass', 'compass-outline') }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Alerts', tabBarIcon: tabIcon('notifications', 'notifications-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
