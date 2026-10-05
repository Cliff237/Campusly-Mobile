// src/ui/FloatingInput.tsx
import React, { useState } from 'react';
import { View, TextInput, type TextInputProps, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { haptics } from '@/lib/haptics';

interface FloatingInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export function FloatingInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  value,
  onChangeText,
  onFocus,
  onBlur,
  ...props
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  
  const labelPosition = useSharedValue(hasValue || isFocused ? 1 : 0);
  const borderColor = useSharedValue(error ? '#ef4444' : (isDark ? '#334155' : '#e2e8f0'));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    labelPosition.value = withTiming(1, { duration: 200 });
    borderColor.value = withTiming(error ? '#ef4444' : '#4f46e5', { duration: 200 });
    haptics.light();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!hasValue) {
      labelPosition.value = withTiming(0, { duration: 200 });
    }
    borderColor.value = withTiming(
      error ? '#ef4444' : (isDark ? '#334155' : '#e2e8f0'), 
      { duration: 200 }
    );
    onBlur?.(e);
  };

  // Theme-aware colors
  const bgColor = isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const iconColor = isFocused || hasValue ? '#4f46e5' : mutedColor;

  const labelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(labelPosition.value, [0, 1], [20, -10]) },
        { scale: interpolate(labelPosition.value, [0, 1], [1, 0.85]) },
      ],
      color: labelPosition.value === 1 ? (error ? '#ef4444' : '#4f46e5') : mutedColor,
    };
  });

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inputContainer, borderStyle, { backgroundColor: bgColor }]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={22}
            color={iconColor}
            style={styles.leftIcon}
          />
        )}

        <View style={styles.textContainer}>
          <Animated.Text style={[styles.label, labelStyle]}>
            {label}
          </Animated.Text>

          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[styles.textInput, { color: textColor }]}
            placeholderTextColor={mutedColor}
            {...props}
          />
        </View>

        {rightIcon && (
          <Pressable
            onPress={() => {
              haptics.light();
              onRightIconPress?.();
            }}
            hitSlop={10}
            style={styles.rightIconContainer}
          >
            <Ionicons name={rightIcon} size={22} color={mutedColor} />
          </Pressable>
        )}
      </Animated.View>

      {error && (
        <Animated.Text
          entering={FadeInDown.duration(200)}
          style={styles.errorText}
        >
          {error}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  leftIcon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: 0,
    fontSize: 14,
    fontWeight: '500',
    zIndex: 1,
  },
  textInput: {
    paddingTop: 8,
    fontSize: 16,
    flex: 1,
  },
  rightIconContainer: {
    padding: 4,
  },
  errorText: {
    marginTop: 8,
    marginLeft: 16,
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});