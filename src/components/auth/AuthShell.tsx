// src/components/auth/AuthShell.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/ui/AppText';
import { BrandLockup } from '@/ui/brand/BrandLockup';
import { HeroBackdrop } from '@/ui/brand/HeroBackdrop';
import { radius } from '@/ui/tokens';
import { useAppTheme } from '@/ui/useAppTheme';

/** How far the white sheet rides up over the hero. */
const SHEET_OVERLAP = 28;

/** Keeps content readable on tablets / wide web windows. */
const COLUMN = { width: '100%', maxWidth: 520, alignSelf: 'center' } as const;

export interface AuthShellProps {
  /** Large greeting set on the hero. */
  title: string;
  subtitle?: string;
  /** Form content, rendered at the top of the sheet. */
  children: ReactNode;
  /** Secondary actions, anchored to the bottom of the sheet. */
  footer?: ReactNode;
  /** Shorter hero (same look, less height) for longer forms such as sign-up. */
  compact?: boolean;
  /** Extra hero content under the subtitle, e.g. a step indicator. */
  heroExtra?: ReactNode;
}

/**
 * Shared frame for the auth flow: a violet brand hero (logo, greeting, soft
 * proximity rings) with a rounded sheet carrying the form.
 *
 * Layout notes
 * - The hero is a fixed share of the screen height (42 %; 36 % on short phones;
 *   ~32 % when `compact`), so it never jumps when validation messages appear —
 *   the form simply grows into the free space of the sheet.
 * - `footer` is pinned to the bottom edge on phones; on short phones there is
 *   no free space and the page scrolls instead.
 * - When the keyboard opens we scroll to the bottom so the focused field sits
 *   right above the keyboard and the hero slides away.
 */
export function AuthShell({ title, subtitle, children, footer, compact, heroExtra }: AuthShellProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const short = height < 700; // e.g. iPhone SE
  const wide = width >= 600; // tablets / desktop web
  const heroHeight = wide
    ? compact ? 280 : 340
    : compact
      // Room for lockup + title + subtitle + step bar, never less (safe-area aware).
      ? Math.round(Math.min(Math.max(height * 0.32, insets.top + 216), 300))
      : Math.round(Math.min(Math.max(height * (short ? 0.36 : 0.42), 236), 400));
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.heroGradient[0] }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* ── Hero ── */}
          <LinearGradient
            colors={colors.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: heroHeight, overflow: 'hidden' }}
          >
            <HeroBackdrop
              topInset={insets.top}
              visibleHeight={heroHeight - SHEET_OVERLAP}
              // the step bar sits near the bottom of the hero: keep the amber dot clear of it
              bottomClearance={heroExtra ? 44 : 22}
            />

            <View
              style={[
                COLUMN,
                {
                  flex: 1,
                  paddingTop: insets.top + 14,
                  paddingHorizontal: 24,
                  paddingBottom: SHEET_OVERLAP + (short || compact ? 20 : 28),
                },
              ]}
            >
              <Animated.View entering={FadeInDown.duration(500)}>
                <BrandLockup tone="hero" />
              </Animated.View>

              <View style={{ flex: 1, minHeight: 16 }} />

              <Animated.View entering={FadeInDown.duration(500).delay(90)}>
                <AppText variant="display" tone="hero" accessibilityRole="header">
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText variant="bodyLg" tone="heroMuted" style={{ marginTop: 6 }}>
                    {subtitle}
                  </AppText>
                ) : null}
                {heroExtra}
              </Animated.View>
            </View>
          </LinearGradient>

          {/* ── Sheet (fills the remaining height) ── */}
          <Animated.View
            entering={SlideInDown.duration(480)}
            style={{
              flexGrow: 1,
              marginTop: -SHEET_OVERLAP,
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
            }}
          >
            <View
              style={[
                COLUMN,
                {
                  flexGrow: 1,
                  // Phones: footer pinned to the bottom edge. Tablets: keep it close to the form.
                  justifyContent: wide ? 'flex-start' : 'space-between',
                  paddingHorizontal: 24,
                  paddingTop: short ? 24 : 32,
                  paddingBottom: Math.max(insets.bottom, 16) + 20,
                },
              ]}
            >
              <View>{children}</View>
              {footer ? <View style={{ marginTop: wide ? 36 : 24 }}>{footer}</View> : null}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
