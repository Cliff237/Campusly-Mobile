import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { fontFamily } from './fonts';
import { useAppTheme } from './useAppTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  focused: boolean;
  color: ColorValue;
  active: IconName;
  idle: IconName;
}

/** Animated tab icon with floating capsule highlight and spring bounce */
function AnimatedTabIcon({ focused, active, idle }: TabIconProps) {
  const { colors, isDark } = useAppTheme();
  const iconScale = useSharedValue(focused ? 1.15 : 0.92);
  const pillOpacity = useSharedValue(focused ? 1 : 0);
  const pillScale = useSharedValue(focused ? 1 : 0.7);
  const glowTranslateY = useSharedValue(focused ? 0 : 4);

  useEffect(() => {
    iconScale.value = withSpring(focused ? 1.15 : 0.92, {
      damping: 12,
      stiffness: 260,
    });
    pillOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
    pillScale.value = withSpring(focused ? 1 : 0.7, {
      damping: 14,
      stiffness: 280,
    });
    glowTranslateY.value = withSpring(focused ? 0 : 4, {
      damping: 14,
      stiffness: 280,
    });
  }, [focused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const animatedPillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateY: glowTranslateY.value }],
  }));

  return (
    <View style={styles.iconContainer}>
      {/* Animated active capsule backdrop */}
      <Animated.View
        style={[
          styles.activeCapsule,
          {
            backgroundColor: isDark ? 'rgba(127, 99, 234, 0.28)' : '#EDE8FF',
            borderColor: isDark ? 'rgba(167, 139, 250, 0.45)' : '#D4C9F8',
          },
          animatedPillStyle,
        ]}
      />

      {/* Springing Icon */}
      <Animated.View style={animatedIconStyle}>
        <Ionicons
          name={focused ? active : idle}
          size={22}
          color={focused ? colors.brand : colors.textMuted}
        />
      </Animated.View>

      {/* Top glowing indicator line */}
      <Animated.View
        style={[
          styles.activeIndicatorLine,
          { backgroundColor: colors.brand },
          animatedGlowStyle,
        ]}
      />
    </View>
  );
}

/** Icon renderer generator for tab screens */
export function tabIcon(active: IconName, idle: IconName) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <AnimatedTabIcon focused={focused} color={color} active={active} idle={idle} />;
  };
}

/** Tactile on-press spring button providing physical bounce and haptic response */
export function AnimatedTabBarButton(props: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.88, { damping: 14, stiffness: 360 });
    props.onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 14, stiffness: 360 });
    props.onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    haptics.selection();
    props.onPress?.(e);
  };

  return (
    <Pressable
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[props.style, { flex: 1 }]}
    >
      <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
        {props.children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Floating Island Capsule bottom navigation options.
 * Completely redesigned to hover elegantly above screen content with
 * rounded capsule shape, glow shadow, and lively micro-animations.
 */
export function useTabBarOptions() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom + (Platform.OS === 'android' ? 10 : 6), 18);

  return {
    headerShown: false,
    tabBarShowLabel: true,
    tabBarLabelPosition: 'below-icon',
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarButton: (props: any) => <AnimatedTabBarButton {...props} />,
    tabBarStyle: {
      position: 'absolute',
      bottom: bottomOffset,
      left: 16,
      right: 16,
      height: 68,
      borderRadius: 34,
      backgroundColor: isDark ? '#140E28' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(91, 63, 209, 0.12)',
      elevation: 20,
      shadowColor: '#361E80',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.5 : 0.15,
      shadowRadius: 20,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    tabBarLabelStyle: {
      fontFamily: fontFamily.bold,
      fontSize: 10.5,
      lineHeight: 13,
      marginTop: 2,
    },
  } as const;
}

/**
 * Returns the exact bottom padding required for ScrollViews and FlatLists
 * so that all content scrolls cleanly above the floating capsule tab bar
 * without being clipped or obscured by the bar or phone navigation buttons.
 */
export function useBottomTabOffset(extraPadding = 28) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom + (Platform.OS === 'android' ? 10 : 6), 18);
  return 68 + bottomOffset + extraPadding;
}

/**
 * Returns safe bottom padding for non-tab screens (e.g. detail pages, modals)
 * to ensure action buttons and content stay clear of the Android navigation bar.
 */
export function useScreenBottomPadding(extraPadding = 20) {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12) + extraPadding;
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 58,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeCapsule: {
    position: 'absolute',
    width: 52,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  activeIndicatorLine: {
    position: 'absolute',
    bottom: -4,
    width: 14,
    height: 3,
    borderRadius: 1.5,
  },
});
