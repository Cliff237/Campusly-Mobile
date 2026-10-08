import { useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { mix, readableOn, safeColor } from './color';
import { palette } from './tokens';
import { useAppTheme } from './useAppTheme';
import { resolveMediaUrl } from '@/lib/media';

// Local bundled asset fallback for IAI
const IAI_LOCAL_LOGO = require('../../assets/images/iai-logo.png');

export interface InstitutionMarkProps {
  name: string;
  /** The institution's accent (hex). Falls back to the Campusly brand if missing or invalid. */
  color?: string | null;
  logoUrl?: string | null;
  size?: number;
  /** Corner radius — defaults to roughly a third of the size (a soft "app-icon" square). */
  radius?: number;
}

/** First letters of the first two words — same rule the old cards used. */
export function institutionInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * An institution's identity tile: its logo when it has one, otherwise a monogram on its accent.
 * The accent is the only colour an institution contributes; the monogram colour is chosen for
 * contrast, so any accent stays legible.
 */
export function InstitutionMark({ name, color, logoUrl, size = 56, radius: corner }: InstitutionMarkProps) {
  const { colors } = useAppTheme();
  const r = corner ?? Math.round(size * 0.32);
  const [imgError, setImgError] = useState(false);

  const resolved = resolveMediaUrl(logoUrl);
  const isIai = name?.toLowerCase().includes('iai');

  if (resolved && !imgError) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: r,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Image
          source={{ uri: resolved }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          accessibilityLabel={`${name} logo`}
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  if (isIai) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: r,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Image
          source={IAI_LOCAL_LOGO}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          accessibilityLabel={`${name} logo`}
        />
      </View>
    );
  }

  const accent = safeColor(color, palette.violet[600]);
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      <LinearGradient
        colors={[mix(accent, '#FFFFFF', 0.16), accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <AppText
        weight="extrabold"
        color={readableOn(accent)}
        style={{
          fontSize: Math.round(size * 0.36),
          lineHeight: Math.round(size * 0.46),
          letterSpacing: 0.4,
        }}
      >
        {institutionInitials(name)}
      </AppText>
    </View>
  );
}
