import { Tabs } from 'expo-router';
import { tabIcon, useTabBarOptions } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';

export default function TabLayout() {
  const options = useTabBarOptions();

  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: tabIcon('compass', 'compass-outline'),
        }}
        listeners={{
          tabPress: () => {
            haptics.selection();
          },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: tabIcon('notifications', 'notifications-outline'),
        }}
        listeners={{
          tabPress: () => {
            haptics.selection();
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person', 'person-outline'),
        }}
        listeners={{
          tabPress: () => {
            haptics.selection();
          },
        }}
      />
    </Tabs>
  );
}
