// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { Toast, toastConfig } from '@/ui/Toast';
import '../global.css';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="teacher" />
          <Stack.Screen name="explorer/institution/[id]" />
        </Stack>
        <Toast config={toastConfig} position="top" topOffset={60} />
      </AuthProvider>
    </ThemeProvider>
  );
}
