import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { HeroBackdrop } from './brand/HeroBackdrop';
import { COLUMN } from './layout';
import { useAppTheme } from './useAppTheme';
import React from 'react';

export interface ScreenHeroProps {
  /** Small uppercase line above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Extra hero content under the subtitle. */
  children?: ReactNode;
  /**
   * Height (px) at the bottom of the hero reserved for an element that overlaps its lower edge,
   * such as a floating search field or identity card. Render that element right after the hero
   * with a matching negative top margin.
   */
  overlap?: number;
}

/**
 * The violet brand hero for the top of a screen — same gradient and proximity rings as sign-in,
 * with a softly rounded lower edge. The status-bar area is covered by the hero, so screens that
 * use it should set a light status bar.
 */
export function ScreenHero({ eyebrow, title, subtitle, children, overlap = 0 }: ScreenHeroProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(220);

  return (
    <View
      onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}
      style={{ overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
    >
      <LinearGradient
        colors={colors.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* the lower dot would sit behind the overlapping element, so it is only drawn when there is room */}
      <HeroBackdrop variant="tab" topInset={insets.top} visibleHeight={height - overlap} bottomClearance={30} />

      <View style={{ paddingTop: insets.top + 22, paddingBottom: 26 + overlap, paddingHorizontal: 20 }}>
        <View style={COLUMN}>
          {eyebrow ? (
            <AppText variant="overline" tone="heroMuted" style={{ marginBottom: 6 }}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="display" tone="hero" accessibilityRole="header" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodyLg" tone="heroMuted" style={{ marginTop: 6 }}>
              {subtitle}
            </AppText>
          ) : null}
          {children}
        </View>
      </View>
    </View>
  );
}
