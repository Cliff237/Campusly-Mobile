// src/ui/ThemedText.tsx
import { Text, type TextProps, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';

type TextVariant = 'display' | 'heading' | 'subheading' | 'body' | 'caption' | 'muted' | 'tiny';

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  align?: 'left' | 'center' | 'right';
}

export function ThemedText({
  variant = 'body',
  align = 'left',
  style,
  children,
  ...props
}: ThemedTextProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme-aware colors
  const colors = {
    primary: isDark ? '#f6f3ff' : '#201d2e',
    secondary: isDark ? '#d7d1e4' : '#454052',
    muted: isDark ? '#aaa4b9' : '#716d80',
    subtle: isDark ? '#827b91' : '#9892a3',
  };

  const variantStyles = {
    display: {
      fontSize: 32,
      fontWeight: '700' as const,
      fontFamily: 'SpaceGrotesk',
      letterSpacing: -0.5,
      color: colors.primary,
    },
    heading: {
      fontSize: 24,
      fontWeight: '700' as const,
      fontFamily: 'SpaceGrotesk',
      letterSpacing: -0.3,
      color: colors.primary,
    },
    subheading: {
      fontSize: 18,
      fontWeight: '600' as const,
      fontFamily: 'SpaceGrotesk',
      color: colors.primary,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      fontFamily: 'Inter',
      color: colors.primary,
    },
    caption: {
      fontSize: 14,
      fontWeight: '500' as const,
      fontFamily: 'Inter',
      color: colors.secondary,
    },
    muted: {
      fontSize: 14,
      fontWeight: '400' as const,
      fontFamily: 'Inter',
      color: colors.muted,
    },
    tiny: {
      fontSize: 12,
      fontWeight: '400' as const,
      fontFamily: 'Inter',
      color: colors.subtle,
    },
  };

  const alignStyles = {
    left: { textAlign: 'left' as const },
    center: { textAlign: 'center' as const },
    right: { textAlign: 'right' as const },
  };

  return (
    <Text
      style={[
        variantStyles[variant],
        alignStyles[align],
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

export const styles = StyleSheet.create({});
