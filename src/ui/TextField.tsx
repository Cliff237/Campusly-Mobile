import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import {
  Platform,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { AppText } from './AppText';
import { fontFamily } from './fonts';
import { radius } from './tokens';
import { useAppTheme } from './useAppTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface TextFieldProps extends TextInputProps {
  /** Visible label rendered above the field (also used as the a11y label). */
  label?: string;
  /** Validation message. Turns the field red and replaces `hint`. */
  error?: string;
  hint?: string;
  leftIcon?: IconName;
  /** Trailing control, e.g. a show/hide-password button. */
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
}

/**
 * Label-above text field with a leading icon, a clear focus ring and an inline
 * error message. Colours and sizes come from the theme, so it works in light
 * and dark mode without per-screen ternaries.
 */
export function TextField({
  label,
  error,
  hint,
  leftIcon,
  rightSlot,
  containerStyle,
  onFocus,
  onBlur,
  editable = true,
  ref,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const borderColor = hasError ? colors.danger : focused ? colors.brand : colors.borderStrong;
  const ring = hasError ? colors.dangerRing : colors.focusRing;
  const iconColor = hasError ? colors.danger : focused ? colors.brand : colors.textSubtle;

  return (
    <View style={containerStyle}>
      {label ? (
        <AppText variant="label" tone={hasError ? 'danger' : 'secondary'} style={{ marginBottom: 8 }}>
          {label}
        </AppText>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          paddingHorizontal: 16,
          gap: 12,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: focused ? colors.surface : colors.field,
          opacity: editable ? 1 : 0.6,
          boxShadow: focused
            ? [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 4, color: ring }]
            : undefined,
        }}
      >
        {leftIcon ? <Ionicons name={leftIcon} size={20} color={iconColor} /> : null}

        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.brand}
          cursorColor={colors.brand}
          editable={editable}
          maxFontSizeMultiplier={1.35}
          {...inputProps}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            {
              flex: 1,
              paddingVertical: 14,
              fontSize: 16,
              fontFamily: fontFamily.medium,
              color: colors.text,
              // Web only: the focus ring above replaces the browser outline.
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
            },
            inputProps.style,
          ]}
        />

        {rightSlot}
      </View>

      {hasError ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}
        >
          <Ionicons name="alert-circle" size={15} color={colors.danger} />
          <AppText variant="caption" tone="danger" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
