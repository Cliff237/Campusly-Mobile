import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useAppTheme } from './useAppTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
}

/** Equal-width segments on a tonal track; the selected one is solid brand. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        padding: 4,
        gap: 4,
        borderRadius: 18,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const fg = selected ? colors.onBrand : colors.textMuted;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              borderRadius: 14,
              backgroundColor: selected ? colors.brand : 'transparent',
              opacity: pressed && !selected ? 0.7 : 1,
            })}
          >
            {o.icon ? <Ionicons name={o.icon} size={17} color={fg} /> : null}
            <AppText weight={selected ? 'bold' : 'semibold'} color={fg} style={{ fontSize: 14, lineHeight: 20 }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
