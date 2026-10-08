// src/app/explorer/home.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { useAuth } from '@/lib/auth/AuthContext';
import { useAppTheme } from '@/ui/useAppTheme';
import { AppText } from '@/ui/AppText';
import { BrandLockup } from '@/ui/brand/BrandLockup';
import { SearchField } from '@/ui/SearchField';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { href } from '@/lib/href';

import {
  fetchInstitutionDirectory,
  DirectoryInstitution,
} from '@/lib/api/discover/explorer';
import {
  fetchInstitutionProfile,
  fetchPublicPosts,
  toggleInstitutionFollow,
  togglePostReaction,
} from '@/lib/api/explorer';
import { previewMembershipOtp, redeemMembershipOtp } from '@/lib/api/discover/memberships';
import type { Institution, PublicPost, SchoolInfo } from '@/lib/types/explorer';
import { PostCard } from '@/components/explorer/PostCard';

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All Updates' },
  { value: 'general', label: 'Announcements' },
  { value: 'academic', label: 'Academic' },
  { value: 'event', label: 'Events' },
  { value: 'achievement', label: 'Achievements' },
] as const;

export default function ExplorerHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ institutionId?: string }>();
  const { colors } = useAppTheme();
  const { accessToken, user, logout, refreshMemberships } = useAuth();

  // Institution directory & selection state
  const [directory, setDirectory] = useState<DirectoryInstitution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(
    params.institutionId || null
  );
  const [selectorModalVisible, setSelectorModalVisible] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  // Selected institution details
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync route param changes
  useEffect(() => {
    if (params.institutionId) {
      setSelectedInstitutionId(params.institutionId);
    }
  }, [params.institutionId]);

  // OTP Redemption modal state
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpPreview, setOtpPreview] = useState<any>(null);

  // Load directory on mount
  useEffect(() => {
    let isMounted = true;
    async function loadDirectory() {
      try {
        const data = await fetchInstitutionDirectory({}, accessToken || undefined);
        if (isMounted && data.length > 0) {
          setDirectory(data);
          // If institutionId was supplied in route params, honor it first
          if (params.institutionId && data.some((i) => i.id === params.institutionId)) {
            setSelectedInstitutionId(params.institutionId);
          } else {
            // Default to first institution (or IAI Cameroon if present)
            const iai = data.find((i) => /iai/i.test(i.name));
            setSelectedInstitutionId((prev) => prev || (iai ? iai.id : data[0].id));
          }
        }
      } catch (err: any) {
        console.warn('[Explorer] Failed to fetch directory:', err);
      }
    }
    loadDirectory();
    return () => {
      isMounted = false;
    };
  }, [accessToken, params.institutionId]);

  // Load institution profile & public feed
  const loadInstitutionData = useCallback(
    async (isRefresh = false) => {
      if (!selectedInstitutionId) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const profileData = await fetchInstitutionProfile(
          selectedInstitutionId,
          accessToken || undefined,
        );
        setInstitution(profileData.institution);
        setSchoolInfo(profileData.schoolInfo);

        try {
          const publicPosts = await fetchPublicPosts(
            selectedInstitutionId,
            accessToken || undefined,
          );
          setPosts(publicPosts);
        } catch {
          setPosts([]);
        }
      } catch (err: any) {
        showToast.error('Load Error', err?.message || 'Failed to load school profile.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedInstitutionId, accessToken],
  );

  useEffect(() => {
    if (selectedInstitutionId) {
      loadInstitutionData();
    }
  }, [selectedInstitutionId, loadInstitutionData]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    if (activeCategory === 'all') return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const filteredDirectory = useMemo(() => {
    if (!directorySearch.trim()) return directory;
    const q = directorySearch.toLowerCase();
    return directory.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.city?.toLowerCase().includes(q) ||
        d.country?.toLowerCase().includes(q),
    );
  }, [directory, directorySearch]);

  const handleFollowToggle = async () => {
    if (!selectedInstitutionId || !accessToken) {
      showToast.info('Sign In Required', 'Log in to follow institutions.');
      return;
    }
    haptics.light();
    try {
      const res = await toggleInstitutionFollow(selectedInstitutionId, accessToken);
      setInstitution((prev) =>
        prev
          ? {
              ...prev,
              is_following: res.is_following,
              follower_count: res.follower_count,
            }
          : prev,
      );
      showToast.success(res.is_following ? 'Followed' : 'Unfollowed');
    } catch (err: any) {
      showToast.error('Error', err?.message || 'Failed to update follow');
    }
  };

  const handlePostReact = async (postId: string) => {
    if (!accessToken) {
      showToast.info('Sign In Required', 'Log in to like posts.');
      return;
    }
    haptics.light();
    try {
      const res = await togglePostReaction(postId, accessToken);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_reacted: res.is_reacted,
                reactions_count: res.reactions_count,
              }
            : p,
        ),
      );
    } catch (err: any) {
      showToast.error('Reaction Failed', err?.message || 'Could not react to post');
    }
  };

  const handleWebsitePress = () => {
    const url = institution?.website || schoolInfo?.website;
    if (url) {
      haptics.light();
      const validUrl = url.startsWith('http') ? url : `https://${url}`;
      Linking.openURL(validUrl).catch(() => {
        showToast.error('Could not open link', validUrl);
      });
    } else {
      showToast.info('No Website', 'This institution has not specified a website yet.');
    }
  };

  const handleViewDirections = () => {
    if (!selectedInstitutionId) return;
    haptics.light();
    router.push(href(`/institution/directions?id=${selectedInstitutionId}`));
  };

  const handleViewFullProfile = () => {
    if (!selectedInstitutionId) return;
    haptics.light();
    router.push(href(`/institution/${selectedInstitutionId}`));
  };

  // OTP Preview & Redeem logic
  const handlePreviewOtp = async () => {
    if (otpCode.length < 6) {
      showToast.error('Code Required', 'Please enter your complete 6-digit code.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await previewMembershipOtp(otpCode, accessToken!);
      setOtpPreview(res);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      showToast.error('Invalid Code', err.message || 'Enrollment code is invalid or expired.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRedeemOtp = async () => {
    setOtpLoading(true);
    try {
      await redeemMembershipOtp(otpCode, accessToken!);
      haptics.success();
      showToast.success('Enrollment Successful!', 'Your campus membership is now active.');
      setOtpModalVisible(false);
      setOtpCode('');
      setOtpPreview(null);
      await refreshMemberships();
      router.replace('/(tabs)/discover');
    } catch (err: any) {
      haptics.error();
      showToast.error('Redeem Failed', err.message || 'Could not redeem code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Campusly?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          haptics.medium();
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Top Header — Clean branding + Institution switcher + Actions */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {router.canGoBack() && (
            <TouchableOpacity
              onPress={() => {
                haptics.selection();
                router.back();
              }}
              accessibilityRole="button"
              accessibilityLabel="Back to Discover"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceMuted,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          <BrandLockup tone="default" markSize={32} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Institution Switcher Button */}
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              setSelectorModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch Institution"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="business" size={16} color={colors.brand} />
            <AppText
              variant="caption"
              weight="bold"
              color={colors.text}
              numberOfLines={1}
              style={{ maxWidth: 110 }}
            >
              {institution?.name || 'Campuses'}
            </AppText>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Join / OTP Redeem Action */}
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              setOtpModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Redeem Code"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.brandSoft,
            }}
          >
            <Ionicons name="key-outline" size={18} color={colors.brand} />
          </TouchableOpacity>

          {/* User Sign Out */}
          <TouchableOpacity
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign Out"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
          <AppText variant="body" color={colors.textMuted} style={{ marginTop: 14 }}>
            Loading campus profile...
          </AppText>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadInstitutionData(true)}
              tintColor={colors.brand}
            />
          }
        >
          {/* School Info Hero Card */}
          {institution ? (
            <View
              style={{
                margin: 20,
                padding: 20,
                borderRadius: 24,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <InstitutionMark
                  logoUrl={institution.logo_url}
                  name={institution.name}
                  color={institution.brand_color}
                  size={64}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText
                      variant="heading"
                      weight="bold"
                      color={colors.text}
                      numberOfLines={1}
                      style={{ flexShrink: 1 }}
                    >
                      {institution.name}
                    </AppText>
                    <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <Ionicons name="location" size={14} color={colors.textMuted} />
                    <AppText variant="caption" color={colors.textMuted}>
                      {institution.city}, {institution.region || 'Cameroon'}
                    </AppText>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: colors.surfaceMuted,
                      }}
                    >
                      <AppText variant="overline" color={colors.brand}>
                        {institution.category?.replace('_', ' ').toUpperCase()}
                      </AppText>
                    </View>
                    <AppText variant="caption" color={colors.textMuted}>
                      {institution.follower_count || 0} followers
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Institution Bio / Description */}
              <AppText
                variant="body"
                color={colors.textMuted}
                numberOfLines={3}
                style={{ marginTop: 14, lineHeight: 20 }}
              >
                {institution.description ||
                  schoolInfo?.about ||
                  'Welcome to our digital campus portal on Campusly. Explore our public announcements, events, and campus updates below.'}
              </AppText>

              {/* School Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                {/* Website Link */}
                <TouchableOpacity
                  onPress={handleWebsitePress}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="globe-outline" size={16} color={colors.text} />
                  <AppText variant="caption" weight="bold" color={colors.text}>
                    Website
                  </AppText>
                </TouchableOpacity>

                {/* Map Directions */}
                <TouchableOpacity
                  onPress={handleViewDirections}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="navigate-outline" size={16} color={colors.brand} />
                  <AppText variant="caption" weight="bold" color={colors.brand}>
                    Directions
                  </AppText>
                </TouchableOpacity>

                {/* Full Profile */}
                <TouchableOpacity
                  onPress={handleViewFullProfile}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="information-circle-outline" size={16} color={colors.text} />
                  <AppText variant="caption" weight="bold" color={colors.text}>
                    Info
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Follow Button */}
              <TouchableOpacity
                onPress={handleFollowToggle}
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: institution.is_following
                    ? colors.dangerSoft
                    : colors.brand,
                }}
              >
                <Ionicons
                  name={institution.is_following ? 'heart' : 'heart-outline'}
                  size={16}
                  color={institution.is_following ? colors.danger : '#ffffff'}
                />
                <AppText
                  variant="caption"
                  weight="bold"
                  color={institution.is_following ? colors.danger : '#ffffff'}
                >
                  {institution.is_following ? 'Following School' : 'Follow for Updates'}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Join Campus Banner */}
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 20,
              padding: 16,
              borderRadius: 20,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <AppText variant="body" weight="bold" color={colors.text}>
                Have an enrollment code?
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                Enter your student, parent, or teacher OTP to access your portal.
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                setOtpModalVisible(true);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: colors.brand,
              }}
            >
              <AppText variant="caption" weight="bold" color="#ffffff">
                Join Now
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Feed Filter Pills */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <AppText variant="heading" weight="bold" color={colors.text} style={{ marginBottom: 10 }}>
              Public Updates & News
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {CATEGORY_FILTERS.map((cat) => {
                const active = activeCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => {
                      haptics.selection();
                      setActiveCategory(cat.value);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 18,
                      backgroundColor: active ? colors.brand : colors.surface,
                      borderWidth: 1,
                      borderColor: active ? colors.brand : colors.border,
                    }}
                  >
                    <AppText
                      variant="caption"
                      weight={active ? 'bold' : 'regular'}
                      color={active ? '#ffffff' : colors.text}
                    >
                      {cat.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Public Posts Feed List */}
          <View style={{ paddingHorizontal: 20 }}>
            {filteredPosts.length === 0 ? (
              <View
                style={{
                  padding: 32,
                  alignItems: 'center',
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginTop: 10,
                }}
              >
                <Ionicons name="newspaper-outline" size={40} color={colors.textMuted} />
                <AppText
                  variant="body"
                  weight="bold"
                  color={colors.text}
                  style={{ marginTop: 10 }}
                >
                  No posts published yet
                </AppText>
                <AppText
                  variant="caption"
                  color={colors.textMuted}
                  style={{ textAlign: 'center', marginTop: 4 }}
                >
                  This institution has not published any announcements in this category.
                </AppText>
              </View>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onReact={() => handlePostReact(post.id)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Switch Institution Modal */}
      <Modal
        visible={selectorModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectorModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <AppText variant="title" weight="bold" color={colors.text}>
              Select Campus
            </AppText>
            <TouchableOpacity
              onPress={() => setSelectorModalVisible(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <SearchField
              placeholder="Search directory..."
              value={directorySearch}
              onChangeText={setDirectorySearch}
            />
          </View>

          <FlatList
            data={filteredDirectory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
            renderItem={({ item }) => {
              const isCurrent = item.id === selectedInstitutionId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    haptics.selection();
                    setSelectedInstitutionId(item.id);
                    setSelectorModalVisible(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 18,
                    marginBottom: 10,
                    backgroundColor: isCurrent ? colors.brandSoft : colors.surface,
                    borderWidth: 1,
                    borderColor: isCurrent ? colors.brand : colors.border,
                  }}
                >
                  <InstitutionMark
                    logoUrl={item.logo_url}
                    name={item.name}
                    color={item.brand_accent_color}
                    size={46}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="body" weight="bold" color={colors.text} numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {item.city}, {item.country}
                    </AppText>
                  </View>
                  {isCurrent && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* OTP Redeem Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 24,
              borderRadius: 24,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <AppText variant="title" weight="bold" color={colors.text}>
                Redeem Code
              </AppText>
              <TouchableOpacity onPress={() => setOtpModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <AppText variant="body" color={colors.textMuted} style={{ marginBottom: 16 }}>
              Enter the 6-character invitation code provided by your school administrator.
            </AppText>

            <SearchField
              placeholder="e.g. A1B2C3"
              value={otpCode}
              onChangeText={(txt) => {
                setOtpCode(txt.toUpperCase());
                setOtpPreview(null);
              }}
              autoCapitalize="characters"
            />

            {otpPreview && (
              <View
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <AppText variant="caption" weight="bold" color={colors.brand}>
                  Role: {otpPreview.role?.toUpperCase()}
                </AppText>
                <AppText variant="caption" color={colors.text} style={{ marginTop: 2 }}>
                  Institution: {otpPreview.institution_name}
                </AppText>
                {otpPreview.student_name && (
                  <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                    Linked Student: {otpPreview.student_name}
                  </AppText>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              {!otpPreview ? (
                <TouchableOpacity
                  onPress={handlePreviewOtp}
                  disabled={otpLoading || otpCode.length < 4}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: colors.brand,
                    opacity: otpCode.length < 4 ? 0.6 : 1,
                  }}
                >
                  {otpLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <AppText variant="body" weight="bold" color="#ffffff">
                      Verify Code
                    </AppText>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleRedeemOtp}
                  disabled={otpLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: colors.success,
                  }}
                >
                  {otpLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <AppText variant="body" weight="bold" color="#ffffff">
                      Confirm & Join
                    </AppText>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
