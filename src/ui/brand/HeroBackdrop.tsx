import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { palette } from '../tokens';
import { useAppTheme } from '../useAppTheme';

/**
 * Concentric "proximity" rings — a quiet nod to the BLE check-in at the heart
 * of Campusly. Purely decorative: hidden from screen readers, ignores touches,
 * and freezes when the OS "reduce motion" setting is on.
 */
const RINGS = [
  { radius: 62, opacity: 0.24 },
  { radius: 104, opacity: 0.18 },
  { radius: 152, opacity: 0.13 },
  { radius: 206, opacity: 0.085 },
] as const;

interface RingProps {
  cx: number;
  cy: number;
  radius: number;
  opacity: number;
  index: number;
  color: string;
  progress: SharedValue<number>;
}

function Ring({ cx, cy, radius, opacity, index, color, progress }: RingProps) {
  const animated = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: opacity * (1 - 0.3 * p),
      transform: [{ scale: 1 + p * (0.02 + index * 0.012) }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: cx - radius,
          top: cy - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          borderWidth: 1.25,
          borderColor: color,
        },
        animated,
      ]}
    />
  );
}

interface PingProps {
  x: number;
  y: number;
  size: number;
  color: string;
  progress: SharedValue<number>;
}

/** A person-dot with a sonar halo that expands and fades. */
function PresenceDot({ x, y, size, color, progress }: PingProps) {
  const halo = useAnimatedStyle(() => {
    const p = progress.get();
    return { opacity: 0.45 * (1 - p), transform: [{ scale: 1 + p * 2.2 }] };
  });

  return (
    <View style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color }, halo]}
      />
      <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export interface HeroBackdropProps {
  /** Top safe-area inset, so the rings centre below the status bar. */
  topInset?: number;
  /** Height of the hero that stays visible (i.e. not covered by the sheet). */
  visibleHeight?: number;
  /**
   * Free space the lower (amber) dot needs above the bottom of the visible hero. When the hero is too
   * short to leave that much room — it would be cut by the sheet or collide with content — the dot is
   * simply not drawn. Default 22; screens with a step bar on the hero pass more.
   */
  bottomClearance?: number;
  /**
   * Where the dots sit. `auth` (default): clear of the logo row and the title block of the sign-in
   * screens. `tab`: for heroes whose title starts at the top-left, so the mint dot rides the upper-right
   * of the rings instead of landing on the text.
   */
  variant?: 'auth' | 'tab';
}

export function HeroBackdrop({ topInset = 0, visibleHeight, bottomClearance = 22, variant = 'auth' }: HeroBackdropProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();

  const breathe = useSharedValue(0);
  const ping = useSharedValue(0);

  useEffect(() => {
    breathe.set(
      withRepeat(
        withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
        -1,
        true,
        undefined,
        ReduceMotion.System,
      ),
    );
    ping.set(
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease), reduceMotion: ReduceMotion.System }),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    );
  }, [breathe, ping]);

  const cx = width * 0.8;
  const cy = topInset + 96;
  const onRing = (radius: number, deg: number) => ({
    x: cx + radius * Math.cos((deg * Math.PI) / 180),
    y: cy + radius * Math.sin((deg * Math.PI) / 180),
  });
  // Upper-left of the centre (clear of the logo) and right side (clear of the title text).
  const dotA = variant === 'tab' ? onRing(62, -64) : onRing(104, 205);
  const dotB = onRing(104, 62);
  // Only draw the lower dot when there is room for it above the sheet (and any hero content).
  const showDotB = visibleHeight === undefined || dotB.y <= visibleHeight - bottomClearance;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      {/* soft filled core */}
      <View
        style={{
          position: 'absolute',
          left: cx - 62,
          top: cy - 62,
          width: 124,
          height: 124,
          borderRadius: 62,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />
      {RINGS.map((ring, i) => (
        <Ring
          key={ring.radius}
          cx={cx}
          cy={cy}
          radius={ring.radius}
          opacity={ring.opacity}
          index={i}
          color={colors.heroRing}
          progress={breathe}
        />
      ))}
      <PresenceDot x={dotA.x} y={dotA.y} size={10} color={colors.presence} progress={ping} />
      {showDotB ? <PresenceDot x={dotB.x} y={dotB.y} size={7} color={palette.amber[400]} progress={ping} /> : null}
    </View>
  );
}
