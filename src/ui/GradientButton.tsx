import { StyleSheet, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/ui';
import { useAppTheme } from './useAppTheme';
import React from 'react';

interface GradientButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function GradientButton({
  title,
  loading,
  size = 'md',
  disabled,
  className = '',
  ...props
}: GradientButtonProps) {
  const { colors } = useAppTheme();
  const sizes = {
    sm: { minHeight: 44, paddingHorizontal: 16 },
    md: { minHeight: 52, paddingHorizontal: 24 },
    lg: { minHeight: 58, paddingHorizontal: 32 },
  };

  const activeColors = [colors.brand, colors.brandPressed] as const;
  const disabledColors = [colors.borderStrong, colors.textSubtle] as const;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      className={`w-full ${className}`}
      {...props}
    >
      <LinearGradient
        colors={isDisabled ? disabledColors : (['#6648DD', colors.brand] as const)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          sizes[size],
          {
            shadowColor: colors.brand,
            shadowOpacity: isDisabled ? 0 : 0.35,
            elevation: isDisabled ? 0 : 6,
          },
        ]}
      >
        <ThemedText
          variant="body"
          style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}
        >
          {loading ? 'Please wait...' : title}
        </ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
});