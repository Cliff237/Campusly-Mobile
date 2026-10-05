import { View } from 'react-native';
import { AppText } from '../AppText';
import { BrandMark } from './BrandMark';
import React from 'react';

export interface BrandLockupProps {
  /** `hero` = white wordmark on the violet gradient; `default` = themed text. */
  tone?: 'hero' | 'default';
  markSize?: number;
}

/** Logo mark + "Campusly" wordmark. */
export function BrandLockup({ tone = 'hero', markSize = 40 }: BrandLockupProps) {
  const onHero = tone === 'hero';
  return (
    <View
      accessible
      accessibilityLabel="Campusly"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <BrandMark size={markSize} variant={onHero ? 'glass' : 'solid'} />
      <AppText
        variant="heading"
        weight="extrabold"
        tone={onHero ? 'hero' : 'default'}
        style={{ letterSpacing: -0.5 }}
      >
        Campusly
      </AppText>
    </View>
  );
}
