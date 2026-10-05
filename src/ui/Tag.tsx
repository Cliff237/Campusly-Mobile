import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { accentInk, tint } from './color';
import { useAppTheme } from './useAppTheme';
import React from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type TagTone = 'neutral' | 'brand' | 'success' | 'warning' | 'info' | 'danger';

export interface TagProps {
  label: string;
  icon?: IconName;
  tone?: TagTone;
  /** Tint the tag with an institution accent instead of a semantic tone. */
  accent?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small read-only label (category, role, status). Every tone is a soft background with a
 * text colour from the same family, both checked for WCAG AA.
 */
export function Tag({ label, icon, tone = 'neutral', accent, style }: TagProps) {
  const { colors, isDark } = useAppTheme();

  let bg: string;
  let fg: string;
  if (accent) {
    bg = tint(accent, colors.surface, isDark ? 0.24 : 0.12);
    fg = accentInk(accent, bg, isDark);
  } else {
    const t = {
      neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
      brand: { bg: colors.brandSoft, fg: colors.onBrandSoft },
      success: { bg: colors.successSoft, fg: colors.onSuccessSoft },
      warning: { bg: colors.warningSoft, fg: colors.onWarningSoft },
      info: { bg: colors.infoSoft, fg: colors.onInfoSoft },
      danger: { bg: colors.dangerSoft, fg: colors.onDangerSoft },
    }[tone];
    bg = t.bg;
    fg = t.fg;
  }

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          height: 26,
          paddingHorizontal: 10,
          borderRadius: 13,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
      <AppText weight="semibold" color={fg} numberOfLines={1} style={{ fontSize: 12.5, lineHeight: 16 }}>
        {label}
      </AppText>
    </View>
  );
}
