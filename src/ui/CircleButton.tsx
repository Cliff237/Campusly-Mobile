import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from './useAppTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface CircleButtonProps {
  icon: IconName;
  onPress?: (e: GestureResponderEvent) => void;
  /** Always required: icon-only buttons have no visible label. */
  accessibilityLabel: string;
  /** `surface` = raised on a light/dark page, `glass` = translucent over the violet hero, `soft` = flat tonal. */
  variant?: 'surface' | 'glass' | 'soft';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Round icon button with a 44 pt touch target. */
export function CircleButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 44,
  style,
}: CircleButtonProps) {
  const { colors, shadow } = useAppTheme();
  const v = {
    surface: { bg: colors.surface, border: colors.border, fg: colors.text, shadow: shadow.sm },
    glass: { bg: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.3)', fg: '#FFFFFF', shadow: undefined },
    soft: { bg: colors.surfaceMuted, border: 'transparent', fg: colors.textSecondary, shadow: undefined },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: v.border,
          backgroundColor: v.bg,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          boxShadow: v.shadow,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={v.fg} />
    </Pressable>
  );
}
