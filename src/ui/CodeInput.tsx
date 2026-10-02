import { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { useAppTheme } from './useAppTheme';

export interface CodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Number of boxes. Default 6. */
  length?: number;
  autoFocus?: boolean;
  /** Red outline, e.g. after a wrong code. */
  error?: boolean;
  accessibilityLabel?: string;
}

/** Blinking cursor shown in the box that will receive the next digit. */
function Caret({ color }: { color: string }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 520, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
          withTiming(1, { duration: 520, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width: 2, height: 26, borderRadius: 1, backgroundColor: color }, style]} />;
}

/**
 * One-time-code entry as separate boxes. A single, invisible TextInput sits on top and holds the
 * real value, so typing, paste, deletion, the number pad and autofill all behave exactly like
 * a plain input — the boxes only visualise it.
 */
export function CodeInput({
  value,
  onChangeText,
  length = 6,
  autoFocus,
  error,
  accessibilityLabel = 'Code',
}: CodeInputProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const next = Math.min(value.length, length - 1);

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, pointerEvents: 'none' }}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          const active = focused && i === next;
          const border = error ? colors.danger : active ? colors.brand : filled ? colors.borderStrong : colors.border;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 60,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: border,
                backgroundColor: active ? colors.surface : colors.field,
                boxShadow: active
                  ? [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 4, color: error ? colors.dangerRing : colors.focusRing }]
                  : undefined,
              }}
            >
              {filled ? (
                <AppText weight="bold" style={{ fontSize: 24, lineHeight: 30 }}>
                  {value[i]}
                </AppText>
              ) : active && !filled ? (
                <Caret color={colors.brand} />
              ) : null}
            </View>
          );
        })}
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        selectionColor="transparent"
        accessibilityLabel={accessibilityLabel}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          StyleSheet.absoluteFill,
          { opacity: 0.02, color: 'transparent' },
          Platform.OS === 'web' ? ({ outlineStyle: 'none', cursor: 'text' } as object) : null,
        ]}
      />
    </View>
  );
}
