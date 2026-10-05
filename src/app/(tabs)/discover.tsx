/* eslint-disable import/first */
// app/(discover)/index.tsx  (or wherever DiscoverScreen lives)
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/ui/AppText';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { ScreenHero } from '@/ui/ScreenHero';
import { SearchField } from '@/ui/SearchField';
import { Skeleton } from '@/ui/Skeleton';
import { COLUMN, useColumnInset } from '@/ui/layout';
import { useAppTheme } from '@/ui/useAppTheme';
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

/** Card-shaped placeholder shown while the directory loads for the first time. */
function DirectorySkeleton() {
  const { colors } = useAppTheme();
  return (
    <View style={[COLUMN, { paddingHorizontal: 20 }]}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            marginBottom: 14,
            padding: 16,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Skeleton width={58} height={58} radius={19} />
            <View style={{ flex: 1, gap: 10 }}>
              <Skeleton width="80%" height={16} />
              <Skeleton width="45%" height={12} />
            </View>
          </View>
          <Skeleton width={96} height={26} radius={13} style={{ marginTop: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 }}>
            <Skeleton width={140} height={14} style={{ marginTop: 10 }} />
            <Skeleton width={92} height={38} radius={19} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors, shadow } = useAppTheme();
  const insets = useSafeAreaInsets();
  const inset = useColumnInset();
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
    <View>
      <ScreenHero
        overlap={30}
        title={user?.full_name ? `Hello, ${user.full_name.split(' ')[0]}` : 'Discover'}
        subtitle={activeMemberships.length > 0 ? 'Switch campuses or explore new ones.' : 'Find your institution on Campusly.'}
      />

      {/* search + filters float over the lower edge of the hero */}
      <View style={[COLUMN, { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: -28 }]}>
        <SearchField
          elevated
          placeholder="Search institutions"
          value={search}
          onChangeText={setSearch}
          containerStyle={{ flex: 1 }}
        />
        <Pressable
          onPress={() => { haptics.light(); setFilterModalVisible(true); }}
          accessibilityRole="button"
          accessibilityLabel="Filters"
          style={({ pressed }) => ({
            width: 54,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            elevation: 3,
            shadowColor: '#43299F',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          })}
        >
          <Ionicons name="options-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 18 }}
        contentContainerStyle={{ paddingHorizontal: inset, gap: 8 }}
      >
        {QUICK_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={type === t.value}
            onPress={() => { haptics.light(); setType(t.value); }}
          />
        ))}
      </ScrollView>

      {activeMemberships.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ marginTop: 26 }}>
          <AppText variant="subheading" style={[COLUMN, { paddingHorizontal: 20, marginBottom: 12 }]}>
            Your campuses
          </AppText>
          <StoriesRow memberships={activeMemberships} onPress={openMembershipDashboard} />
        </Animated.View>
      )}

      <View
        style={[
          COLUMN,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 26, marginBottom: 14 },
        ]}
      >
        <AppText variant="subheading">
          {activeMemberships.length > 0 ? 'Explore more' : 'All institutions'}
        </AppText>
        {loading && !refreshing && institutions.length > 0 ? <ActivityIndicator size="small" color={colors.brand} /> : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <FlatList
        data={institutions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <DirectorySkeleton />
          ) : (
            <EmptyState icon="school-outline" title="No institutions found" message="Try adjusting your search or filters." />
          )
        }
        renderItem={({ item, index }) => {
          const membership = memberships?.find(m => m.institution_id === item.id && m.status === 'active');
          return (
            <Animated.View entering={FadeInDown.duration(350).delay(Math.min(index, 6) * 40)} style={[COLUMN, { paddingHorizontal: 20 }]}>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* keeps the status-bar icons readable once the hero has scrolled away */}
      {insets.top > 0 ? (
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.heroGradient[0], zIndex: 5, pointerEvents: 'none' }}
        />
      ) : null}

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
    </View>
  );
}
