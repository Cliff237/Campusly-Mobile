/* eslint-disable react-hooks/set-state-in-effect */
// src/app/explorer/[id].tsx
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import { ExplorerHero } from '@/components/explorer/ExplorerHero';
import { ExplorerAbout } from '@/components/explorer/ExplorerAbout';
import { ExplorerFeed } from '@/components/explorer/ExplorerFeed';
import { ExplorerPrograms } from '@/components/explorer/ExplorerPrograms';
import { OtpFab } from '@/components/discover/OtpFab'; // Reuse the OTP FAB
import { ThemedText } from '@/ui/ThemedText';

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

type ExplorerSection = 'about' | 'feed' | 'programs';

export default function ExplorerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { accessToken } = useAuth();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [section, setSection] = useState<ExplorerSection>('about');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading && !refreshing) {
    return (
      <View className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-bg-dark' : 'bg-bg'}`}>
        <View className="w-12 h-12 rounded-full border-4 border-accent-start border-t-transparent animate-spin" />
      </View>
    );
  }

  if (error && !institution) {
    return (
      <View className={`flex-1 items-center justify-center px-6 ${colorScheme === 'dark' ? 'bg-bg-dark' : 'bg-bg'}`}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <ThemedText variant="heading" className="text-center text-text dark:text-text-dark mt-4 mb-2">
          Institution unavailable
        </ThemedText>
        <ThemedText variant="muted" className="text-center mb-6">
          {error}
        </ThemedText>
        <TouchableOpacity onPress={() => loadData()} className="bg-accent-start px-6 py-3 rounded-xl">
          <ThemedText variant="body" className="text-white font-semibold">Try again</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-bg-dark' : 'bg-bg'}`}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="w-10 h-10 rounded-full bg-surface/80 dark:bg-surface-dark/80 items-center justify-center ml-2 backdrop-blur-md"
            >
              <Ionicons name="arrow-back" size={22} color={colorScheme === 'dark' ? '#f8fafc' : '#0f172a'} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView 
        className="flex-1"
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#4f46e5" />}
        showsVerticalScrollIndicator={false}
      >
        {institution && (
          <>
            <ExplorerHero
              institution={institution}
              isFollowing={institution.is_following}
              onFollow={handleFollow}
            />

            <View className="flex-row border-b border-border bg-bg dark:border-border-dark dark:bg-bg-dark">
              {(['about', 'feed', 'programs'] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: section === item }}
                  onPress={() => { haptics.light(); setSection(item); }}
                  className="flex-1 items-center py-4"
                >
                  <ThemedText
                    variant="caption"
                    className={section === item ? 'text-accent-start font-semibold' : 'text-text-muted dark:text-text-muted-dark'}
                  >
                    {item[0].toUpperCase() + item.slice(1)}
                  </ThemedText>
                  {section === item && <View className="absolute bottom-0 h-0.5 w-12 bg-accent-start" />}
                </TouchableOpacity>
              ))}
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

      {/* Persistent OTP CTA at the bottom */}
      <OtpFab onRedeemSuccess={() => { /* Optionally refresh or show success state */ }} />
    </View>
  );
}