/* eslint-disable import/first */
/* eslint-disable import/no-unresolved */
// app/(discover)/index.tsx  (or wherever DiscoverScreen lives)
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/ui/ThemedText';
import { ThemedInput } from '@/ui/ThemedInput';
import { StoriesRow } from '@/components/discover/StoriesRow';
import { InstitutionCard } from '@/components/discover/InstitutionCard';
import { FilterBottomSheet } from '@/components/discover/FilterBottomSheet';
import { OtpFab } from '@/components/discover/OtpFab';

;
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { DirectoryInstitution, fetchInstitutionDirectory, toggleFollow } from '@/lib/api/discover/explorer';
import type { Membership } from '@/lib/api/discover/memberships';

const QUICK_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'university', label: 'Universities' },
  { value: 'training_school', label: 'Training' },
] as const;

export default function DiscoverScreen() {
  const router = useRouter();
  const { user, memberships, selectInstitution, getMembershipForInstitution, getDashboardRoute, accessToken } = useAuth();

  const [institutions, setInstitutions] = useState<DirectoryInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [country, setCountry] = useState('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const activeMemberships = useMemo(() => (memberships || []).filter((m) => m.status === 'active'), [memberships]);
  const countries = useMemo(() => Array.from(new Set(institutions.map(i => i.country))).sort(), [institutions]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const filters: any = {};
      if (search.trim()) filters.search = search.trim();
      if (type !== 'all') filters.type = type;
      if (country !== 'all') filters.country = country;

      const data = await fetchInstitutionDirectory(filters, accessToken || undefined);
      setInstitutions(data);
    } catch (err: any) {
      showToast.error('Error', err.message || 'Failed to load institutions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, type, country, accessToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const openMembershipDashboard = useCallback(async (membership: Membership) => {
    if (user?.is_platform_admin) {
      router.push(`/explorer/institution/${membership.institution_id}` as any);
      return;
    }

    const isSupportedDashboard = membership?.base_actor === 'student' || membership?.base_actor === 'teacher';

    if (membership && isSupportedDashboard) {
      const destination = getDashboardRoute(membership.base_actor);
      console.log('[Membership navigation] opening role workspace', {
        institutionId: membership.institution_id,
        membershipId: membership.membership_id,
        role: membership.base_actor,
        status: membership.status,
        destination,
      });
      await selectInstitution(membership.institution_id, membership.membership_id);
      router.replace(destination as any);
      return;
    }

    console.warn('[Membership navigation] no supported dashboard for membership', {
      institutionId: membership?.institution_id,
      membershipId: membership?.membership_id,
      role: membership?.base_actor,
      status: membership?.status,
    });
    router.push(`/explorer/institution/${membership.institution_id}` as any);
  }, [user, selectInstitution, getDashboardRoute, router]);

  const handleInstitutionClick = useCallback(async (institutionId: string) => {
    const membership = getMembershipForInstitution(institutionId);
    if (membership) {
      await openMembershipDashboard(membership);
      return;
    }
    router.push(`/explorer/institution/${institutionId}` as any);
  }, [getMembershipForInstitution, openMembershipDashboard, router]);

  const handleFollow = async (institutionId: string) => {
    haptics.light();
    try {
      const res = await toggleFollow(institutionId, accessToken || undefined);
      setInstitutions(prev => prev.map(inst =>
        inst.id === institutionId ? { ...inst, is_following: res.is_following, follower_count: res.follower_count } : inst
      ));
      showToast.success(res.is_following ? 'Followed' : 'Unfollowed', res.is_following ? 'You will receive updates.' : 'Removed from your followed list.');
    } catch (err: any) {
      showToast.error('Error', err.message || 'Failed to update follow status');
    }
  };

  // Rendered as an element (not passed as a bare function reference) so
  // FlatList doesn't treat it as a new component type on every keystroke —
  // that was remounting the header, including the search input, on each character.
  const header = (
    <View className="px-5 pt-3 pb-5">
      <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
        <ThemedText variant="display" className="text-text dark:text-text-dark">
          {user?.full_name ? `Hello, ${user.full_name.split(' ')[0]}` : 'Discover'}
        </ThemedText>
        <ThemedText variant="muted" className="mt-1">
          {activeMemberships.length > 0 ? 'Switch campuses or explore new ones.' : 'Find your institution on Campusly.'}
        </ThemedText>
      </Animated.View>

      <ThemedInput
        placeholder="Search institutions"
        value={search}
        onChangeText={setSearch}
        leftIcon={<Ionicons name="search-outline" size={20} color="#64748b" />}
        containerStyle={{ marginBottom: 20 }}
      />

      <View className="flex-row items-center justify-between mb-6 border-b border-border dark:border-border-dark">
        <View className="flex-row gap-5">
          {QUICK_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              onPress={() => { haptics.light(); setType(t.value); }}
              className="pb-3"
              style={{ borderBottomWidth: 2, borderBottomColor: type === t.value ? '#4f46e5' : 'transparent' }}
            >
              <ThemedText
                variant="caption"
                className={type === t.value ? 'text-accent-start font-semibold' : 'text-text-muted dark:text-text-muted-dark'}
              >
                {t.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => { haptics.light(); setFilterModalVisible(true); }}
          className="flex-row items-center gap-1 pb-3"
        >
          <Ionicons name="options-outline" size={16} color="#64748b" />
          <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">More</ThemedText>
        </TouchableOpacity>
      </View>

      {activeMemberships.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mb-6">
          <ThemedText variant="subheading" className="mb-3 text-text dark:text-text-dark">Your campuses</ThemedText>
          <StoriesRow memberships={activeMemberships} onPress={openMembershipDashboard} />
        </Animated.View>
      )}

      <ThemedText variant="subheading" className="mb-1 text-text dark:text-text-dark">
        {activeMemberships.length > 0 ? 'Explore more' : 'All institutions'}
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <FlatList
        data={institutions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={!loading ? (
          <View className="items-center justify-center py-16 px-8">
            <View className="w-16 h-16 rounded-full bg-surface-hover dark:bg-surface-hover-dark items-center justify-center mb-4">
              <Ionicons name="school-outline" size={28} color="#64748b" />
            </View>
            <ThemedText variant="subheading" className="text-center text-text dark:text-text-dark mb-1">No institutions found</ThemedText>
            <ThemedText variant="muted" className="text-center">Try adjusting your search or filters.</ThemedText>
          </View>
        ) : null}
        renderItem={({ item, index }) => {
          const membership = memberships?.find(m => m.institution_id === item.id && m.status === 'active');
          return (
            <Animated.View entering={FadeInDown.duration(350).delay(Math.min(index, 6) * 40)} className="px-5">
              <InstitutionCard
                institution={item}
                isFollowing={item.is_following}
                isBound={!!membership}
                baseActor={membership?.base_actor}
                onFollow={() => handleFollow(item.id)}
                onView={() => handleInstitutionClick(item.id)}
              />
            </Animated.View>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#4f46e5" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {loading && !refreshing && (
        <View className="absolute inset-0 items-center justify-center bg-bg/80 dark:bg-bg-dark/80 z-10">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}

      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        selectedType={type}
        onSelectType={setType}
        selectedCountry={country}
        onSelectCountry={setCountry}
        countries={countries}
        onApply={() => { setFilterModalVisible(false); loadData(); }}
      />

      <OtpFab onRedeemSuccess={() => { loadData(true); }} />
    </SafeAreaView>
  );
}
