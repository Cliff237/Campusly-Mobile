import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useAppTheme } from './useAppTheme';
import React from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type AlertTone = 'danger' | 'warning' | 'success' | 'info';

const ICONS: Record<AlertTone, IconName> = {
  danger: 'alert-circle',
  warning: 'warning',
  success: 'checkmark-circle',
  info: 'information-circle',
};

export interface InlineAlertProps {
  message: string;
  title?: string;
  tone?: AlertTone;
  style?: StyleProp<ViewStyle>;
}

/** In-flow status banner (form errors, announcements, status callouts). */
export function InlineAlert({ message, title, tone = 'danger', style }: InlineAlertProps) {
  const { colors } = useAppTheme();

  const scheme = {
    danger: { fg: colors.danger, bg: colors.dangerSoft, text: colors.onDangerSoft, ring: colors.dangerRing },
    warning: { fg: colors.warning, bg: colors.warningSoft, text: colors.onWarningSoft, ring: 'rgba(217, 119, 6, 0.16)' },
    success: { fg: colors.success, bg: colors.successSoft, text: colors.onSuccessSoft, ring: 'rgba(15, 122, 86, 0.16)' },
    info: { fg: colors.info, bg: colors.infoSoft, text: colors.onInfoSoft, ring: 'rgba(37, 99, 184, 0.16)' },
  }[tone];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: scheme.bg,
          borderWidth: 1,
          borderColor: scheme.ring,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
        }}
      >
        <Ionicons name={ICONS[tone]} size={18} color={scheme.fg} />
      </View>
      <View style={{ flex: 1 }}>
        {title ? (
          <AppText variant="label" weight="bold" color={scheme.text}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" weight="medium" color={scheme.text} style={{ lineHeight: 18 }}>
          {message}
        </AppText>
      </View>
    </View>
  );
}
