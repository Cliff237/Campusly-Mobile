// src/lib/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/lib/api';
import { authStorage } from '@/lib/authStorage';
import { fetchMyMemberships, type Membership } from '@/lib/api/discover/memberships';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  requestNotificationPermission,
  getPushToken,
  registerPushTokenWithBackend,
  setupNotificationListener,
  setupForegroundNotificationListener,
} from '@/lib/notifications';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_platform_admin: boolean;
  language_preference?: 'en' | 'fr';
  theme_preference?: 'light' | 'dark';
  profile_image_url?: string | null;
}

interface AuthContextValue {
  // State
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isReady: boolean;

  // Membership State
  memberships: Membership[];
  membershipsLoading: boolean;
  selectedInstitutionId: string | null;
  selectedMembershipId: string | null;
  currentMembership: Membership | null;

  // Actions
  login: (identifier: string, password: string) => Promise<User>;
  updateProfile: (data: Record<string, unknown>) => Promise<User>;
  logout: () => void;
  refreshMemberships: () => Promise<void>;
  /**
   * Select an institution context. Pass the membership id when a user holds
   * more than one role in the same institution so the role is not guessed.
   */
  selectInstitution: (institutionId: string, membershipId?: string) => Promise<void>;
  clearSelectedInstitution: () => void;

  // Helpers
  getMembershipForInstitution: (institutionId: string) => Membership | undefined;
  getDashboardRoute: (baseActor: string) => string;
  hasPermission: (permission: string) => boolean;
  hasAny: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'campusly_access_token';
const REFRESH_TOKEN_KEY = 'campusly_refresh_token';
const USER_KEY = 'campusly_user';
const INSTITUTION_KEY = 'campusly_selected_institution';
const MEMBERSHIP_KEY = 'campusly_selected_membership';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [, setRefreshToken] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const loadMemberships = useCallback(async (token: string) => {
    setMembershipsLoading(true);
    try {
      const data = await fetchMyMemberships(token);
      setMemberships(data);
    } catch (err) {
      console.error('Failed to load memberships:', err);
      setMemberships([]);
    } finally {
      setMembershipsLoading(false);
    }
  }, []);

  // 1. Hydrate auth state on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        const [token, refresh, savedUser, savedInst, savedMembership] = await Promise.all([
          authStorage.getItem(TOKEN_KEY),
          authStorage.getItem(REFRESH_TOKEN_KEY),
          authStorage.getItem(USER_KEY),
          AsyncStorage.getItem(INSTITUTION_KEY),
          AsyncStorage.getItem(MEMBERSHIP_KEY),
        ]);

        if (token) {
          setAccessToken(token);
          setRefreshToken(refresh);
          try {
            const currentUser = await api.getCurrentUser(token);
            setUser(currentUser);
            await authStorage.setItem(USER_KEY, JSON.stringify(currentUser));
            await loadMemberships(token);

            // Register push token on session restore if not already done
            const hasPermission = await requestNotificationPermission();
            if (hasPermission) {
              const pushToken = await getPushToken();
              if (pushToken) {
                const deviceId = Constants.deviceId || Constants.expoConfig?.extra?.deviceId || 'unknown';
                try {
                  await registerPushTokenWithBackend(token, pushToken, deviceId);
                } catch (error) {
                  console.error('[Auth] Failed to register push token on restore:', error);
                }
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown session restore error';
            const isUnauthorized = /unauthorized|401|token/i.test(message);
            console.error('[Auth] Session restore failed', { message, isUnauthorized });

            // A cached user must never keep an invalid access token alive.
            // The backend currently has no token-refresh endpoint, so a 401 is
            // a definitive sign-in-again state rather than an offline fallback.
            if (isUnauthorized) {
              setUser(null);
              setAccessToken(null);
              setRefreshToken(null);
              setMemberships([]);
              setSelectedInstitutionId(null);
              setSelectedMembershipId(null);
              await Promise.all([
                authStorage.deleteItem(TOKEN_KEY),
                authStorage.deleteItem(REFRESH_TOKEN_KEY),
                authStorage.deleteItem(USER_KEY),
                AsyncStorage.removeItem(INSTITUTION_KEY),
                AsyncStorage.removeItem(MEMBERSHIP_KEY),
              ]);
              console.log('[Auth] Invalid saved session cleared; sign-in is required.');
            } else if (savedUser) {
              // Preserve the offline fallback only for transient failures.
              setUser(JSON.parse(savedUser) as User);
              await loadMemberships(token);
            } else {
              await authStorage.deleteItem(TOKEN_KEY);
              await authStorage.deleteItem(REFRESH_TOKEN_KEY);
            }
          }
        }
        if (savedInst) {
          setSelectedInstitutionId(savedInst);
        }
        if (savedMembership) {
          setSelectedMembershipId(savedMembership);
        }
      } catch (error) {
        console.error('Failed to hydrate auth state:', error);
      } finally {
        setIsReady(true);
      }
    };
    hydrate();
  }, [loadMemberships]);

  // Setup notification listeners
  useEffect(() => {
    const cleanupTapped = setupNotificationListener((notification) => {
      console.log('[Auth] Notification tapped:', notification);
      // Handle navigation to attendance screen based on notification data
      const data = notification.data as any;
      if (data?.type === 'attendance' && data?.sessionId) {
        // Navigate to attendance screen
        // This will be handled by the app's navigation system
        console.log('[Auth] Navigate to attendance session:', data.sessionId);
      }
    });

    const cleanupForeground = setupForegroundNotificationListener((notification) => {
      console.log('[Auth] Foreground notification:', notification);
      // Handle foreground notifications (in-app alerts)
    });

    return () => {
      cleanupTapped?.();
      cleanupForeground?.();
    };
  }, []);

  // 3. Login Action
  const login = async (identifier: string, password: string): Promise<User> => {
    const data = await api.login(identifier, password);

    const newUser = data.user;
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token;

    setUser(newUser);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);

    await authStorage.setItem(TOKEN_KEY, newAccessToken);
    await authStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    await authStorage.setItem(USER_KEY, JSON.stringify(newUser));

    await loadMemberships(newAccessToken);

    // Request notification permission and register push token
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
      const pushToken = await getPushToken();
      if (pushToken) {
        const deviceId = Constants.deviceId || Constants.expoConfig?.extra?.deviceId || 'unknown';
        try {
          await registerPushTokenWithBackend(newAccessToken, pushToken, deviceId);
        } catch (error) {
          console.error('[Auth] Failed to register push token:', error);
        }
      }
    }

    return newUser;
  };

  const updateProfile = async (data: Record<string, unknown>): Promise<User> => {
    if (!accessToken) throw new Error('You are not signed in');
    const updatedUser = await api.updateProfile(accessToken, data);
    setUser(updatedUser);
    await authStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  };

  // 4. Logout Action
  const logout = async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setMemberships([]);
    setSelectedInstitutionId(null);
    setSelectedMembershipId(null);

    await authStorage.deleteItem(TOKEN_KEY);
    await authStorage.deleteItem(REFRESH_TOKEN_KEY);
    await authStorage.deleteItem(USER_KEY);
    await AsyncStorage.removeItem(INSTITUTION_KEY);
    await AsyncStorage.removeItem(MEMBERSHIP_KEY);
  };

  // 5. Refresh Memberships (e.g., after OTP redemption)
  const refreshMemberships = async () => {
    if (accessToken) {
      await loadMemberships(accessToken);
    }
  };

  // 6. Institution Selection
  const selectInstitution = async (institutionId: string, membershipId?: string) => {
    setSelectedInstitutionId(institutionId);
    setSelectedMembershipId(membershipId ?? null);
    await AsyncStorage.setItem(INSTITUTION_KEY, institutionId);
    if (membershipId) {
      await AsyncStorage.setItem(MEMBERSHIP_KEY, membershipId);
    } else {
      await AsyncStorage.removeItem(MEMBERSHIP_KEY);
    }
  };

  const clearSelectedInstitution = async () => {
    setSelectedInstitutionId(null);
    setSelectedMembershipId(null);
    await AsyncStorage.removeItem(INSTITUTION_KEY);
    await AsyncStorage.removeItem(MEMBERSHIP_KEY);
  };

  // 7. Helpers
  const getMembershipForInstitution = useCallback(
    (institutionId: string) => {
      return memberships.find(
        (m) => m.institution_id === institutionId && m.status === 'active'
      );
    },
    [memberships]
  );

  // Membership identity matters: one account can be both a student and a
  // teacher in the same institution. Fall back to the legacy institution-only
  // selection for existing sessions saved before MEMBERSHIP_KEY was added.
  const currentMembership = selectedMembershipId
    ? memberships.find((membership) => membership.membership_id === selectedMembershipId && membership.status === 'active') || null
    : selectedInstitutionId
      ? getMembershipForInstitution(selectedInstitutionId) || null
      : null;

  const getDashboardRoute = (baseActor: string): string => {
    switch (baseActor) {
      case 'teacher': return '/teacher/home';
      case 'staff': return '/(tabs)/staff';
      case 'school_admin': return '/(tabs)/admin';
      case 'student': return '/(student)/home';
      case 'guardian': return '/(tabs)/guardian';
      default: return '/(tabs)/discover';
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentMembership) return false;
    return currentMembership.permissions.includes(permission);
  };

  const hasAny = (permissions: string[]): boolean => {
    if (!currentMembership) return false;
    return permissions.some((p) => currentMembership.permissions.includes(p));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isReady,
        memberships,
        membershipsLoading,
        selectedInstitutionId,
        selectedMembershipId,
        currentMembership,
        login,
        updateProfile,
        logout,
        refreshMemberships,
        selectInstitution,
        clearSelectedInstitution,
        getMembershipForInstitution,
        getDashboardRoute,
        hasPermission,
        hasAny,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
