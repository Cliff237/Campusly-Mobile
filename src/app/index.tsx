// src/app/index.tsx
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Root Entry Point — Smart Routing Hub
 *
 * Routing Logic:
 * ─────────────────────────────────────────────────────────────
 * 1. While hydrating auth state from SecureStore → show loading
 * 2. Not authenticated              → Auth screen
 * 3. Platform Admin                 → Admin dashboard (always)
 * 4. Any other user (bound or not)  → Discover screen (the hub)
 *
 * Why Discover-first?
 * ─────────────────────────────────────────────────────────────
 * Campusly is multi-tenant AND multi-role. A user can be a
 * Student at Institute1, Teacher at Institute2, Guardian at
 * Institute3, and Staff at Institute4. Discover serves as the
 * central hub where they see ALL their contexts ("Your Campuses"
 * stories) and can switch between them or explore new institutions.
 *
 * The selected institution persists in AsyncStorage so returning
 * users can quickly jump back into their last workspace from
 * Discover, but Discover itself is always the "home" tab.
 */
export default function Index() {
  const { user, isAuthenticated, isReady } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 1. Wait for auth state to hydrate from SecureStore
  //    (prevents logged-in users from briefly seeing the auth screen)
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        }}
      >
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // 2. Not authenticated → auth screen
  if (!isAuthenticated) {
    return <Redirect href="/(auth)"  />;
  }
  return <Redirect href="/(tabs)/discover" />;
}