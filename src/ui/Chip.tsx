import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useAppTheme } from './useAppTheme';
import React from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leftIcon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/** Selectable pill for filters and segmented choices. Selected = solid brand, otherwise a quiet outline. */
export function Chip({ label, selected = false, onPress, leftIcon, style }: ChipProps) {
  const { colors } = useAppTheme();
  const fg = selected ? colors.onBrand : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 40,
          paddingHorizontal: 16,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: selected ? colors.brand : colors.border,
          backgroundColor: selected ? colors.brand : colors.surface,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {leftIcon ? <Ionicons name={leftIcon} size={16} color={fg} /> : null}
      <AppText weight={selected ? 'bold' : 'semibold'} color={fg} style={{ fontSize: 14, lineHeight: 20 }}>
        {label}
      </AppText>
    </Pressable>
  );
}
