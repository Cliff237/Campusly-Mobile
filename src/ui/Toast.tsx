import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useAppTheme } from './useAppTheme';

type NoticeKind = 'success' | 'error' | 'info';
type Notice = { kind: NoticeKind; title: string; message?: string };
let publishNotice: ((notice: Notice) => void) | undefined;

/** App-owned notification surface. It replaces react-native-toast-message so it works in Expo Go. */
export function Toast(_: { config?: unknown; position?: string; topOffset?: number }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-18));
  const { colors, shadow } = useAppTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    publishNotice = (next) => setNotice(next);
    return () => { publishNotice = undefined; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    opacity.setValue(0); translateY.setValue(-18);
    Animated.parallel([Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }), Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 200 })]).start();
    const timer = setTimeout(() => setNotice(null), notice.kind === 'error' ? 6200 : 3600);
    return () => clearTimeout(timer);
  }, [notice, opacity, translateY]);

  if (!notice) return null;

  const tone = {
    success: { fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' as const },
    error: { fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle' as const },
    info: { fg: colors.brand, bg: colors.brandSoft, icon: 'information-circle' as const },
  }[notice.kind];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 9999,
        alignItems: 'center',
        opacity,
        transform: [{ translateY }],
        pointerEvents: 'box-none',
      }}
    >
      <Pressable
        onPress={() => setNotice(null)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint="Tap to dismiss"
        style={{
          width: '100%',
          maxWidth: 480,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingLeft: 12,
          paddingRight: 14,
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: shadow.lg,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: tone.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={tone.icon} size={22} color={tone.fg} />
        </View>

        <View style={{ flex: 1 }}>
          <AppText variant="label" numberOfLines={1}>
            {notice.title}
          </AppText>
          {notice.message ? (
            <AppText variant="caption" tone="muted" numberOfLines={3} style={{ marginTop: 1 }}>
              {notice.message}
            </AppText>
          ) : null}
        </View>

        <Ionicons name="close" size={18} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  );
}

function notify(kind: NoticeKind, title: string, message?: string) {
  if (publishNotice) publishNotice({ kind, title, message });
  else console.warn('[Notification] Host is not mounted', { kind, title, message });
}

export const showToast = { success: (title: string, message?: string) => notify('success', title, message), error: (title: string, message?: string) => notify('error', title, message), info: (title: string, message?: string) => notify('info', title, message) };
// Kept only so the root layout and existing imports remain source-compatible during migration.
export const toastConfig = {};
