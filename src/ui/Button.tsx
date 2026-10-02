import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppText } from './AppText';
import { radius } from './tokens';
import { useAppTheme } from './useAppTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES = {
  sm: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm, icon: 16, font: 14, lineHeight: 20 },
  md: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, icon: 18, font: 15, lineHeight: 21 },
  lg: { minHeight: 56, paddingHorizontal: 22, borderRadius: radius.md, icon: 20, font: 16, lineHeight: 22 },
} as const;

export interface ButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables presses and announces "busy" to screen readers. */
  loading?: boolean;
  /** Label shown while `loading` (defaults to `title`). */
  loadingLabel?: string;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  /** Stretch to the parent's width (default) or hug the content. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Campusly button. One component, five intents:
 * `primary` (main action — one per screen), `secondary` (tonal), `outline`,
 * `ghost` (text-only) and `danger`.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  loadingLabel,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  accessibilityLabel,
  testID,
  style,
}: ButtonProps) {
  const { colors, shadow } = useAppTheme();
  const s = SIZES[size];
  const isDisabled = disabled || loading;
  const label = loading && loadingLabel ? loadingLabel : title;

  const palette = {
    primary: { bg: colors.brand, fg: colors.onBrand, pressedBg: colors.brandPressed },
    secondary: { bg: colors.brandSoft, fg: colors.onBrandSoft, pressedBg: colors.brandSoftPressed },
    outline: { bg: 'transparent', fg: colors.text, pressedBg: colors.surfaceMuted },
    ghost: { bg: 'transparent', fg: colors.brand, pressedBg: colors.brandSoft },
    danger: { bg: colors.danger, fg: '#FFFFFF', pressedBg: colors.onDangerSoft },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        {
          minHeight: s.minHeight,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          overflow: 'hidden',
          backgroundColor: variant === 'primary' ? colors.brand : pressed ? palette.pressedBg : palette.bg,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.borderStrong,
          opacity: isDisabled && !loading ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          boxShadow: variant === 'primary' && !isDisabled ? shadow.brand : undefined,
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {variant === 'primary' ? (
            <LinearGradient
              colors={colors.buttonGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
            />
          ) : null}
          {variant === 'primary' && pressed ? (
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', backgroundColor: 'rgba(16, 12, 32, 0.16)' }]} />
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? (
              <ActivityIndicator size="small" color={palette.fg} />
            ) : leftIcon ? (
              <Ionicons name={leftIcon} size={s.icon} color={palette.fg} />
            ) : null}
            <AppText
              variant="button"
              color={palette.fg}
              numberOfLines={1}
              style={{ fontSize: s.font, lineHeight: s.lineHeight }}
            >
              {label}
            </AppText>
            {rightIcon && !loading ? <Ionicons name={rightIcon} size={s.icon} color={palette.fg} /> : null}
          </View>
        </>
      )}
    </Pressable>
  );
}
