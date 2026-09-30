// src/ui/ThemedInput.tsx
import { useState, type ReactNode } from 'react';
import {
  View,
  TextInput,
  type TextInputProps,
  StyleSheet,
  Animated as RNAnimated,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { ThemedText } from './ThemedText';
import { haptics } from '@/lib/haptics';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode; // Accepts any React Node (e.g., <Ionicons /> or <IconButton />)
  rightIcon?: ReactNode; // Accepts any React Node
  containerStyle?: any;
}

export function ThemedInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: ThemedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animated border color
  const [borderColorAnim] = useState(() => new RNAnimated.Value(0));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    RNAnimated.timing(borderColorAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    haptics.light();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    RNAnimated.timing(borderColorAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  // Theme colors
  const theme = {
    bg: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderIdle: isDark ? '#334155' : '#e2e8f0',
    borderFocus: '#4f46e5',
    borderError: '#ef4444',
    text: isDark ? '#f8fafc' : '#0f172a',
    placeholder: isDark ? '#64748b' : '#94a3b8',
  };

  // Interpolate border color
  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? theme.borderError : theme.borderIdle, theme.borderFocus],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <ThemedText
          variant="caption"
          style={[
            styles.label,
            { color: error ? theme.borderError : (isDark ? '#cbd5e1' : '#334155') },
          ]}
        >
          {label}
        </ThemedText>
      )}

      {/* Input container */}
      <RNAnimated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.bg,
            borderColor,
          },
        ]}
      >
        {/* Left icon */}
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        {/* Text input */}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Right icon (renders exactly what you pass, no extra wrapper) */}
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </RNAnimated.View>

      {/* Error or hint message */}
      {error ? (
        <ThemedText
          variant="tiny"
          style={[styles.message, { color: theme.borderError }]}
        >
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText
          variant="tiny"
          style={[styles.message, { color: theme.placeholder }]}
        >
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    fontFamily: 'Inter',
  },
  rightIcon: {
    marginLeft: 8,
  },
  message: {
    marginTop: 6,
    marginLeft: 4,
  },
});