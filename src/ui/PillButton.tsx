import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useAppTheme } from './useAppTheme';
import React from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface PillButtonProps {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  /** `solid` = call to action, `tonal` = already-done state, `outline` = secondary. */
  variant?: 'solid' | 'tonal' | 'outline';
  icon?: IconName;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Compact action for cards and rows (e.g. Follow / Following). For full-width actions use `Button`. */
export function PillButton({
  title,
  onPress,
  variant = 'solid',
  icon,
  loading = false,
  accessibilityLabel,
  style,
}: PillButtonProps) {
  const { colors } = useAppTheme();
  const p = {
    solid: { bg: colors.brand, fg: colors.onBrand, border: colors.brand, pressed: colors.brandPressed },
    tonal: { bg: colors.brandSoft, fg: colors.onBrandSoft, border: colors.brandSoft, pressed: colors.brandSoftPressed },
    outline: { bg: 'transparent', fg: colors.text, border: colors.borderStrong, pressed: colors.surfaceMuted },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ busy: loading }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minWidth: 44,
          height: 38,
          paddingHorizontal: 15,
          borderRadius: 19,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: p.border,
          backgroundColor: pressed ? p.pressed : p.bg,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={16} color={p.fg} />
      ) : null}
      <AppText weight="bold" color={p.fg} style={{ fontSize: 14, lineHeight: 20 }}>
        {title}
      </AppText>
    </Pressable>
  );
}
