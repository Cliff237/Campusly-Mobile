import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NoticeKind = 'success' | 'error' | 'info';
type Notice = { kind: NoticeKind; title: string; message?: string };
let publishNotice: ((notice: Notice) => void) | undefined;

const palette = {
  success: { accent: '#23815f', soft: '#e2f4ec', icon: 'checkmark-circle' as const },
  error: { accent: '#be4168', soft: '#fbe8ee', icon: 'alert-circle' as const },
  info: { accent: '#5b3fd1', soft: '#ece9ff', icon: 'information-circle' as const },
};

/** App-owned notification surface. It replaces react-native-toast-message so it works in Expo Go. */
export function Toast(_: { config?: unknown; position?: string; topOffset?: number }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-18));
  const scheme = useColorScheme();

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
  const colors = palette[notice.kind]; const dark = scheme === 'dark';
  return <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: 58, left: 16, right: 16, zIndex: 9999, opacity, transform: [{ translateY }] }}>
    <Pressable onPress={() => setNotice(null)} style={{ backgroundColor: dark ? '#211d2e' : '#ffffff', borderRadius: 22, borderWidth: 1, borderColor: colors.accent, shadowColor: '#201d2e', shadowOpacity: 0.14, shadowRadius: 14, elevation: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: dark ? colors.accent : colors.soft, justifyContent: 'center', alignItems: 'center', marginRight: 11 }}><Ionicons name={colors.icon} size={22} color={dark ? '#ffffff' : colors.accent} /></View>
        <View style={{ flex: 1, paddingTop: 1 }}><Text style={{ color: dark ? '#f6f3ff' : '#201d2e', fontWeight: '700', fontSize: 15 }}>{notice.title}</Text>{notice.message ? <Text style={{ color: dark ? '#d7d1e4' : '#5f5a6d', fontSize: 13, lineHeight: 18, marginTop: 2 }}>{notice.message}</Text> : null}</View>
        <Ionicons name="close" size={18} color={dark ? '#aaa4b9' : '#716d80'} />
      </View>
      <View style={{ height: 4, backgroundColor: colors.accent }} />
    </Pressable>
  </Animated.View>;
}

function notify(kind: NoticeKind, title: string, message?: string) {
  if (publishNotice) publishNotice({ kind, title, message });
  else console.warn('[Notification] Host is not mounted', { kind, title, message });
}

export const showToast = { success: (title: string, message?: string) => notify('success', title, message), error: (title: string, message?: string) => notify('error', title, message), info: (title: string, message?: string) => notify('info', title, message) };
// Kept only so the root layout and existing imports remain source-compatible during migration.
export const toastConfig = {};
