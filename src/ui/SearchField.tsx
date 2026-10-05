import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { fontFamily } from "./fonts";
import { crossPlatformShadow } from "./tokens";
import { useAppTheme } from "./useAppTheme";

export interface SearchFieldProps extends TextInputProps {
  /** Lift the field off the page with a soft shadow (use when it overlaps a hero). */
  elevated?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Rounded search box with a focus ring. Same text-input behaviour as before — only the look changed. */
export function SearchField({
  elevated = false,
  containerStyle,
  onFocus,
  onBlur,
  ...inputProps
}: SearchFieldProps) {
  const { colors, shadow } = useAppTheme();
  const [focused, setFocused] = useState(false);

  const base = elevated ? shadow.md : shadow.sm;
  const shadows = [
    ...(focused
      ? [
          {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 0,
            spreadDistance: 4,
            color: colors.focusRing,
          },
        ]
      : []),
    ...(typeof base === "string" ? [] : base),
  ];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          height: 54,
          paddingHorizontal: 16,
          gap: 12,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: focused ? colors.brand : colors.border,
          backgroundColor: colors.surface,
          ...crossPlatformShadow(shadows, elevated ? 6 : 2),
        },
        containerStyle,
      ]}
    >
      <Ionicons
        name="search"
        size={20}
        color={focused ? colors.brand : colors.textSubtle}
      />
      <TextInput
        accessibilityRole="search"
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.brand}
        cursorColor={colors.brand}
        maxFontSizeMultiplier={1.35}
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            flex: 1,
            paddingVertical: 12,
            fontSize: 16,
            fontFamily: fontFamily.medium,
            color: colors.text,
            ...(Platform.OS === "web"
              ? ({ outlineStyle: "none" } as object)
              : null),
          },
          inputProps.style,
        ]}
      />
    </View>
  );
}
