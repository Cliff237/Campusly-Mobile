import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from './fonts';
import { useAppTheme } from './useAppTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Bottom tab bar look shared by every tab layout: surface background, hairline top border,
 * Plus Jakarta labels, and a soft brand "pill" behind the active icon. Heights account for the
 * home-indicator inset instead of using a fixed 85 pt.
 */
export function useTabBarOptions() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);

  return {
    headerShown: false,
    tabBarLabelPosition: 'below-icon',
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 64 + bottom,
      paddingTop: 6,
      paddingBottom: bottom,
    },
    tabBarLabelStyle: {
      fontFamily: fontFamily.semibold,
      fontSize: 11.5,
      lineHeight: 14,
      marginTop: 4,
      flexShrink: 0,
    },
  } as const;
}

/** Icon renderer for a tab: outline when idle, filled on a brand-tinted pill when active. */
export function tabIcon(active: IconName, idle: IconName) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    const { colors } = useAppTheme();
    return (
      <View
        style={{
          width: 58,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? colors.brandSoft : 'transparent',
        }}
      >
        <Ionicons name={focused ? active : idle} size={22} color={focused ? colors.brand : color} />
      </View>
    );
  };
}
