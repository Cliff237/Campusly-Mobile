import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useAppTheme } from './useAppTheme';

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

/** In-flow status banner (form errors, "closing soon", locked-institution notices…). */
export function InlineAlert({ message, title, tone = 'danger', style }: InlineAlertProps) {
  const { colors } = useAppTheme();

  const scheme = {
    danger: { fg: colors.danger, bg: colors.dangerSoft, text: colors.onDangerSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft, text: colors.onWarningSoft },
    success: { fg: colors.success, bg: colors.successSoft, text: colors.onSuccessSoft },
    info: { fg: colors.info, bg: colors.infoSoft, text: colors.onInfoSoft },
  }[tone];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: scheme.bg,
        },
        style,
      ]}
    >
      <Ionicons name={ICONS[tone]} size={20} color={scheme.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? (
          <AppText variant="label" color={scheme.text}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" weight="medium" color={scheme.text}>
          {message}
        </AppText>
      </View>
    </View>
  );
}
