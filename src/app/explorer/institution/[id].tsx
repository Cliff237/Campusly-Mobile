/* eslint-disable react-hooks/set-state-in-effect */
// src/app/explorer/[id].tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExplorerHero } from '@/components/explorer/ExplorerHero';
import { ExplorerAbout } from '@/components/explorer/ExplorerAbout';
import { ExplorerFeed } from '@/components/explorer/ExplorerFeed';
import { ExplorerPrograms } from '@/components/explorer/ExplorerPrograms';
import { ExplorerTabs, type ExplorerSection } from '@/components/explorer/ExplorerTabs';
import { OtpFab } from '@/components/discover/OtpFab'; // Reuse the OTP FAB
import { Button } from '@/ui/Button';
import { CircleButton } from '@/ui/CircleButton';
import { EmptyState } from '@/ui/EmptyState';
import { COLUMN } from '@/ui/layout';
import { useAppTheme } from '@/ui/useAppTheme';

import { 
  fetchInstitutionProfile, 
  fetchPublicPosts, 
  toggleInstitutionFollow,
  togglePostReaction
} from '@/lib/api/explorer';
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import type { Institution, PublicPost, SchoolInfo } from '@/lib/types/explorer';

/** Height of the top bar content (the safe-area inset is added on top). */
const BAR_CONTENT = 56;

/**
 * Floating top bar. Over the hero it is just a glass back button; once the hero has scrolled away it
 * becomes a solid bar carrying the back button and the About / Feed / Programs tabs, so neither
 * ever overlaps the page content.
 */
function TopBar({ scrolled, onHero, onBack, tabs }: { scrolled: boolean; onHero: boolean; onBack: () => void; tabs?: ReactNode }) {
  const { colors, shadow } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Over the hero: only the round button exists (nothing full-width that could swallow scrolling).
  if (!scrolled) {
    return (
      <View style={{ position: 'absolute', top: insets.top + 6, left: 12, zIndex: 10 }}>
        <CircleButton icon="arrow-back" variant={onHero ? 'glass' : 'surface'} accessibilityLabel="Back" onPress={onBack} />
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        height: insets.top + BAR_CONTENT,
        paddingTop: insets.top + 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        boxShadow: shadow.sm,
      }}
    >
      <CircleButton icon="arrow-back" variant="soft" accessibilityLabel="Back" onPress={onBack} />
      {tabs ? <View style={{ flex: 1 }}>{tabs}</View> : null}
    </Animated.View>
  );
}

export default function ExplorerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [section, setSection] = useState<ExplorerSection>('about');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // top-bar state (presentation only)
  const [scrolled, setScrolled] = useState(false);
  const [tabsTop, setTabsTop] = useState<number | null>(null);
  const barHeight = insets.top + BAR_CONTENT;

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);
      const profileData = await fetchInstitutionProfile(id, accessToken || undefined);
      setInstitution(profileData.institution);
      setSchoolInfo(profileData.schoolInfo);

      try {
        const postsData = await fetchPublicPosts(id, accessToken || undefined);
        setPosts(postsData);
      } catch (err: any) {
        setPosts([]);
        showToast.info('Feed unavailable', err.message || 'Public posts could not be loaded.');
      }
    } catch (err: any) {
      const message = err.message || 'Failed to load institution';
      setError(message);
      showToast.error('Unable to load institution', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  const handleFollow = async () => {
    if (!accessToken) {
      showToast.info('Login Required', 'Please log in to follow institutions.');
      return;
    }
    haptics.light();
    try {
      const res = await toggleInstitutionFollow(id, accessToken);
      setInstitution((prev) => prev ? {
        ...prev,
        is_following: res.is_following,
        follower_count: res.follower_count,
      } : prev);
      showToast.success(res.is_following ? 'Followed' : 'Unfollowed');
    } catch (err: any) {
      showToast.error('Error', err.message || 'Failed to update follow status');
    }
  };

  const handlePostReact = async (postId: string) => {
    if (!accessToken) {
      showToast.info('Login Required', 'Please log in to react to posts.');
      return;
    }
    try {
      const res = await togglePostReaction(postId, accessToken);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, is_reacted: res.is_reacted, reactions_count: res.reactions_count } : p
      ));
    } catch (err: any) {
      showToast.error('Error', err.message || 'Failed to react');
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (tabsTop === null) return;
    const next = e.nativeEvent.contentOffset.y >= tabsTop - barHeight;
    if (next !== scrolled) setScrolled(next);
  };

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.brand} />
        <TopBar scrolled={false} onHero={false} onBack={() => router.back()} />
      </View>
    );
  }

  if (error && !institution) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <EmptyState
          tone="danger"
          icon="alert-circle-outline"
          title="Institution unavailable"
          message={error}
          action={<Button title="Try again" size="md" fullWidth={false} onPress={() => loadData()} />}
        />
        <TopBar scrolled={false} onHero={false} onBack={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={scrolled && !isDark ? 'dark' : 'light'} />

      <ScrollView
        style={{ flex: 1 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {institution && (
          <>
            <ExplorerHero
              institution={institution}
              isFollowing={institution.is_following}
              onFollow={handleFollow}
            />

            <View
              onLayout={(e) => setTabsTop(e.nativeEvent.layout.y)}
              style={{ marginTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View style={[COLUMN, { paddingHorizontal: 8 }]}>
                <ExplorerTabs section={section} onChange={setSection} />
              </View>
            </View>

            {section === 'about' && (
              <ExplorerAbout
                description={institution.description}
                schoolInfo={schoolInfo}
                category={institution.category}
              />
            )}
            {section === 'feed' && (
              <ExplorerFeed posts={posts} loading={loading} onReact={handlePostReact} />
            )}
            {section === 'programs' && <ExplorerPrograms />}
          </>
        )}
      </ScrollView>

      <TopBar
        scrolled={scrolled}
        onHero
        onBack={() => router.back()}
        tabs={<ExplorerTabs compact section={section} onChange={setSection} />}
      />

      {/* Persistent OTP CTA at the bottom */}
      <OtpFab bottomOffset={16 + insets.bottom} onRedeemSuccess={() => { /* Optionally refresh or show success state */ }} />
    </View>
  );
}
