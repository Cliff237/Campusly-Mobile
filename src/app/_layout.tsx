// src/app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { useAppFonts } from '@/ui/fonts';
import { Toast, toastConfig } from '@/ui/Toast';
import '../global.css';

// Keep the native splash visible until the fonts are ready, so the first frame
// is never drawn in a fallback font.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    // On a font error we still continue (system font) rather than block the app.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(guardian)" />
          <Stack.Screen name="teacher" />
          <Stack.Screen name="explorer/home" />
          <Stack.Screen name="explorer/institution/[id]" />
          <Stack.Screen name="institution/[id]" />
          <Stack.Screen name="institution/directions" />
          <Stack.Screen name="institution/edit" />
        </Stack>
        <Toast config={toastConfig} position="top" topOffset={60} />
      </AuthProvider>
    </ThemeProvider>
  );
}
