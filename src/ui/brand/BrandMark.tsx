import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { palette } from '../tokens';
import { useAppTheme } from '../useAppTheme';

export interface BrandMarkProps {
  size?: number;
  /**
   * `glass`  – translucent tile for use on the violet hero.
   * `solid`  – violet gradient tile for light/dark surfaces.
   */
  variant?: 'glass' | 'solid';
}

/**
 * Campusly mark: an open "C" ring (campus) with a mint dot at its centre
 * (a student detected nearby). Drawn with plain Views, so it needs no SVG
 * library and scales to any size.
 *
 * PLACEHOLDER: swap for the official logo when one exists — every screen
 * renders the brand through this component.
 */
export function BrandMark({ size = 48, variant = 'glass' }: BrandMarkProps) {
  const { colors } = useAppTheme();

  const u = size / 56; // design grid: 56 × 56
  const ring = 30 * u; // outer diameter of the "C"
  const stroke = 6 * u;
  const centreRadius = (ring - stroke) / 2;
  const capOffset = Math.SQRT1_2 * centreRadius; // radius · cos 45°
  const c = size / 2;
  const dot = 8.5 * u;
  const glyph = '#FFFFFF';

  const cap = (dy: number) => ({
    position: 'absolute' as const,
    left: c + capOffset - stroke / 2,
    top: c + dy * capOffset - stroke / 2,
    width: stroke,
    height: stroke,
    borderRadius: stroke / 2,
    backgroundColor: glyph,
  });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Campusly logo"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        overflow: 'hidden',
        backgroundColor: variant === 'glass' ? 'rgba(255,255,255,0.16)' : palette.violet[600],
      }}
    >
      {variant === 'solid' ? (
        <LinearGradient
          colors={[palette.violet[500], palette.violet[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* open ring */}
      <View
        style={{
          position: 'absolute',
          left: c - ring / 2,
          top: c - ring / 2,
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: stroke,
          borderColor: glyph,
          borderRightColor: 'transparent',
        }}
      />
      {/* rounded ends */}
      <View style={cap(-1)} />
      <View style={cap(1)} />
      {/* presence dot */}
      <View
        style={{
          position: 'absolute',
          left: c - dot / 2,
          top: c - dot / 2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: colors.presence,
        }}
      />

      {variant === 'glass' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              pointerEvents: 'none',
              borderRadius: size * 0.32,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.32)',
            },
          ]}
        />
      ) : null}
    </View>
  );
}
