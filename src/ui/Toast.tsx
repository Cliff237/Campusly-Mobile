import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Animated, Pressable, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "./AppText";
import { BrandMark } from "./brand/BrandMark";
import { crossPlatformShadow } from "./tokens";
import { useAppTheme } from "./useAppTheme";

type NoticeKind = "success" | "error" | "info";
type Notice = { kind: NoticeKind; title: string; message?: string };
let publishNotice: ((notice: Notice) => void) | undefined;

/** App-owned notification toast surface featuring Campusly brand logo and status indicators. */
export function Toast(_: {
  config?: unknown;
  position?: string;
  topOffset?: number;
}) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-18));
  const { colors, shadow } = useAppTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    publishNotice = (next) => setNotice(next);
    return () => {
      publishNotice = undefined;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    opacity.setValue(0);
    translateY.setValue(-18);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 200,
      }),
    ]).start();
    const timer = setTimeout(
      () => setNotice(null),
      notice.kind === "error" ? 6200 : 3600,
    );
    return () => clearTimeout(timer);
  }, [notice, opacity, translateY]);

  if (!notice) return null;

  const tone = {
    success: {
      fg: colors.success,
      bg: colors.successSoft,
      icon: "checkmark" as const,
      border: "rgba(15, 122, 86, 0.3)",
    },
    error: {
      fg: colors.danger,
      bg: colors.dangerSoft,
      icon: "alert" as const,
      border: "rgba(200, 52, 79, 0.3)",
    },
    info: {
      fg: colors.brand,
      bg: colors.brandSoft,
      icon: "information" as const,
      border: "rgba(91, 63, 209, 0.3)",
    },
  }[notice.kind];

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 9999,
        alignItems: "center",
        opacity,
        transform: [{ translateY }],
        pointerEvents: "box-none",
      }}
    >
      <Pressable
        onPress={() => setNotice(null)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint="Tap to dismiss"
        style={{
          width: "100%",
          maxWidth: 480,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingLeft: 12,
          paddingRight: 14,
          backgroundColor: colors.surface,
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: tone.border,
          ...crossPlatformShadow(shadow.lg, 10),
        }}
      >
        {/* Campusly "C" Logo Mark with Status Dot */}
        <View style={{ position: "relative" }}>
          <BrandMark size={38} variant="solid" />
          <View
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: tone.fg,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: colors.surface,
            }}
          >
            <Ionicons name={tone.icon} size={10} color="#FFFFFF" />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <AppText variant="label" weight="extrabold" numberOfLines={1}>
            {notice.title}
          </AppText>
          {notice.message ? (
            <AppText
              variant="caption"
              tone="muted"
              numberOfLines={3}
              style={{ marginTop: 2, lineHeight: 16 }}
            >
              {notice.message}
            </AppText>
          ) : null}
        </View>

        <TouchableOpacity onPress={() => setNotice(null)} style={{ padding: 4 }}>
          <Ionicons name="close" size={18} color={colors.textSubtle} />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}

function notify(kind: NoticeKind, title: string, message?: string) {
  if (publishNotice) publishNotice({ kind, title, message });
  else
    console.warn("[Notification] Host is not mounted", {
      kind,
      title,
      message,
    });
}

export const showToast = {
  success: (title: string, message?: string) =>
    notify("success", title, message),
  error: (title: string, message?: string) => notify("error", title, message),
  info: (title: string, message?: string) => notify("info", title, message),
};
// Kept only so the root layout and existing imports remain source-compatible during migration.
export const toastConfig = {};
