import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { palette } from './tokens';
import { useAppTheme } from './useAppTheme';
import React from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  /** Optional action (a `Button`). */
  action?: ReactNode;
  /** Danger styling for load errors. */
  tone?: 'brand' | 'danger';
}

/**
 * Friendly empty / error state: an icon tile ringed by the same "proximity" motif as the hero,
 * a short title and one supporting line.
 */
export function EmptyState({ icon, title, message, action, tone = 'brand' }: EmptyStateProps) {
  const { colors } = useAppTheme();
  const soft = tone === 'danger' ? colors.dangerSoft : colors.brandSoft;
  const ink = tone === 'danger' ? colors.danger : colors.brand;

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: 128, height: 128, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        <View
          style={{
            position: 'absolute',
            width: 128,
            height: 128,
            borderRadius: 64,
            borderWidth: 1.25,
            borderColor: colors.border,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 104,
            height: 104,
            borderRadius: 52,
            backgroundColor: soft,
            opacity: 0.55,
          }}
        />
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={34} color={ink} />
        </View>
        {/* the two "presence" dots from the brand mark */}
        <View style={{ position: 'absolute', top: 14, left: 22, width: 10, height: 10, borderRadius: 5, backgroundColor: palette.mint[400] }} />
        <View style={{ position: 'absolute', bottom: 22, right: 12, width: 7, height: 7, borderRadius: 3.5, backgroundColor: palette.amber[400] }} />
      </View>

      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" align="center" style={{ marginTop: 6, maxWidth: 300 }}>
          {message}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: 20 }}>{action}</View> : null}
    </View>
  );
}
