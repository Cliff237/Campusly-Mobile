// src/app/index.tsx
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthContext';
import { BrandMark } from '@/ui/brand/BrandMark';
import { HeroBackdrop } from '@/ui/brand/HeroBackdrop';
import { useAppTheme } from '@/ui/useAppTheme';

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
  const { user, isAuthenticated, isReady, memberships, membershipsLoading } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // 1. Wait for auth state to hydrate from SecureStore & initial memberships fetch
  if (!isReady || (isAuthenticated && membershipsLoading)) {
    // Brand-coloured loading screen: continues straight into the auth hero.
    return (
      <LinearGradient
        colors={colors.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28 }}
      >
        <StatusBar style="light" />
        <HeroBackdrop topInset={insets.top} />
        <BrandMark size={76} variant="glass" />
        <ActivityIndicator size="small" color="#FFFFFF" />
      </LinearGradient>
    );
  }

  // 2. Not authenticated → auth screen
  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  // 3. Authenticated user without active institution memberships → Explorer Home
  const activeMemberships = (memberships || []).filter((m) => m.status === 'active');
  if (activeMemberships.length === 0 && !user?.is_platform_admin) {
    return <Redirect href="/explorer/home" />;
  }

  return <Redirect href="/(tabs)/discover" />;
}