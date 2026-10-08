import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAppTheme } from '@/ui/useAppTheme';
import { AppText } from '@/ui/AppText';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { haptics } from '@/lib/haptics';
import { showToast } from '@/ui/Toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchInstitutionById, type DirectoryInstitution } from '@/lib/api/discover/explorer';
import { LeafletMapView } from '@/components/map/LeafletMapView';
import { href } from '@/lib/href';

const TYPE_NAMES: Record<string, string> = {
  university: 'University / Higher Education',
  training_school: 'Professional Training School',
  secondary: 'Secondary / High School',
  technical_institute: 'Technical Institute',
};

const TIER_NAMES: Record<string, string> = {
  small: 'Small Campus (1,000 - 3,000 Students)',
  medium: 'Medium Campus (3,000 - 10,000 Students)',
  large: 'Large Campus (10,000+ Students)',
};

export default function InstitutionProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { accessToken, currentMembership, memberships, user } = useAuth();

  // Find membership if user belongs to this institution
  const matchedMembership =
    currentMembership?.institution_id === id
      ? currentMembership
      : memberships.find((m) => m.institution_id === id);

  const isSchoolAdmin =
    matchedMembership?.base_actor === 'school_admin' || user?.is_platform_admin === true;

  const [institution, setInstitution] = useState<DirectoryInstitution | null>(() => {
    if (matchedMembership) {
      return {
        id: matchedMembership.institution_id,
        name: matchedMembership.institution_name,
        type: (matchedMembership.institution_type as any) || 'university',
        country: matchedMembership.institution_country || 'Cameroon',
        city: matchedMembership.institution_city || '',
        logo_url: matchedMembership.institution_logo_url,
        school_info_content: null,
        brand_accent_color: matchedMembership.institution_brand_color,
        student_tier: 'medium',
        website_url: null,
        created_at: matchedMembership.created_at || new Date().toISOString(),
        is_following: true,
        follower_count: 0,
      };
    }
    return null;
  });

  const [loading, setLoading] = useState(!matchedMembership);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      if (isRefresh) setRefreshing(true);
      else if (!institution) setLoading(true);

      try {
        setError(null);
        const data = await fetchInstitutionById(id, accessToken || undefined);
        setInstitution(data);
      } catch (err: any) {
        console.warn('[InstitutionProfile] load error:', err);
        // If we already have offline/membership fallback data, keep it without showing a blocking error
        if (!institution) {
          setError(err?.message || 'Could not load institution profile.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, accessToken, institution],
  );

  useEffect(() => {
    void loadData();
  }, [id]);

  const websiteUrl = institution?.website_url || institution?.website;

  const handleOpenWebsite = async () => {
    if (!websiteUrl) {
      showToast.info('Website', 'No official website provided for this institution.');
      return;
    }
    haptics.light();
    let target = websiteUrl.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }
    try {
      const supported = await Linking.canOpenURL(target);
      if (supported) {
        await Linking.openURL(target);
      } else {
        await Linking.openURL(target);
      }
    } catch {
      showToast.error('Browser', 'Could not open website URL in browser.');
    }
  };

  const handleOpenEmail = async (email?: string | null) => {
    if (!email) return;
    haptics.light();
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch {
      showToast.info('Email', `Contact email: ${email}`);
    }
  };

  const handleOpenPhone = async (phone?: string | null) => {
    if (!phone) return;
    haptics.light();
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      showToast.info('Phone', `Contact phone: ${phone}`);
    }
  };

  const handleOpenExternalMaps = async () => {
    if (!institution) return;
    haptics.light();
    const query = encodeURIComponent(`${institution.name}, ${institution.city}, ${institution.country}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      }
    } catch {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  const handleShare = async () => {
    if (!institution) return;
    haptics.light();
    try {
      await Share.share({
        title: institution.name,
        message: `${institution.name}\n${institution.city}, ${institution.country}\n${websiteUrl || 'View on Campusly'}`,
        url: websiteUrl || undefined,
      });
    } catch {
      // Ignored
    }
  };

  const accentColor = institution?.brand_accent_color || colors.brand;

  if (loading && !institution) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <AppText variant="body" tone="muted" style={{ marginTop: 12 }}>
          Loading institution profile...
        </AppText>
      </View>
    );
  }

  if (error && !institution) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Ionicons name="alert-circle-outline" size={54} color="#EF4444" />
        <AppText variant="title" weight="extrabold" style={{ marginTop: 12, textAlign: 'center' }}>
          Unable to Load Profile
        </AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: 6, textAlign: 'center' }}>
          {error}
        </AppText>
        <TouchableOpacity
          onPress={() => loadData()}
          style={[styles.retryBtn, { backgroundColor: colors.brand, marginTop: 20 }]}
        >
          <AppText variant="label" weight="bold" color="#FFFFFF">
            Try Again
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <AppText variant="body" tone="muted">
            Go Back
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const instName = institution?.name || 'Institution';
  const typeDisplay = TYPE_NAMES[institution?.type || ''] || institution?.type || 'Educational Institution';
  const tierDisplay = TIER_NAMES[institution?.student_tier || ''] || 'Academic Community';
  const aboutText =
    institution?.school_info_content ||
    institution?.description ||
    `${instName} is a premier educational establishment located in ${institution?.city || 'Cameroon'}, dedicated to academic excellence, innovation, and career empowerment for its student body.`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ─── Top Floating App Bar ─── */}
      <View
        style={[
          styles.floatingHeader,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: isDark ? 'rgba(10, 8, 24, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.7}
          style={[styles.headerIconBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <AppText variant="subheading" weight="bold" numberOfLines={1} style={{ flex: 1, marginHorizontal: 12 }}>
          Institution Profile
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isSchoolAdmin && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit institution info"
              onPress={() => {
                haptics.light();
                router.push(href(`/institution/edit?id=${institution?.id || id}`));
              }}
              activeOpacity={0.7}
              style={[
                styles.headerIconBtn,
                { backgroundColor: colors.surfaceMuted, borderColor: accentColor },
              ]}
            >
              <Ionicons name="pencil" size={17} color={accentColor} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Share institution"
            onPress={handleShare}
            activeOpacity={0.7}
            style={[styles.headerIconBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          >
            <Ionicons name="share-social-outline" size={19} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 36 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Identity Hero Header ─── */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={[accentColor, isDark ? '#120D26' : '#EEF2FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroGradientBg}
          />

          <View style={styles.heroContent}>
            {/* Institution Avatar / Mark */}
            <View
              style={[
                styles.logoContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <InstitutionMark
                name={instName}
                color={accentColor}
                logoUrl={institution?.logo_url}
                size={88}
                radius={24}
              />
            </View>

            {/* Institution Name */}
            <AppText
              variant="title"
              weight="extrabold"
              style={[styles.instTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
            >
              {instName}
            </AppText>

            {/* Badges / Chips */}
            <View style={styles.badgeRow}>
              <View style={[styles.pillBadge, { backgroundColor: 'rgba(99, 102, 241, 0.14)' }]}>
                <Ionicons name="school" size={13} color={colors.brand} />
                <AppText variant="caption" weight="bold" tone="brand">
                  {typeDisplay}
                </AppText>
              </View>

              {institution?.city ? (
                <View style={[styles.pillBadge, { backgroundColor: colors.surfaceMuted }]}>
                  <Ionicons name="location" size={13} color={colors.textMuted} />
                  <AppText variant="caption" tone="muted">
                    {institution.city}, {institution.country}
                  </AppText>
                </View>
              ) : null}

              {institution?.accreditation_number ? (
                <View style={[styles.pillBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <AppText variant="caption" weight="semibold" style={{ color: '#10B981' }}>
                    Accredited: {institution.accreditation_number}
                  </AppText>
                </View>
              ) : (
                <View style={[styles.pillBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                  <AppText variant="caption" weight="semibold" style={{ color: '#10B981' }}>
                    Verified Institution
                  </AppText>
                </View>
              )}

              {isSchoolAdmin && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Edit school info and location"
                  onPress={() => {
                    haptics.light();
                    router.push(href(`/institution/edit?id=${institution?.id || id}`));
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.pillBadge,
                    {
                      backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.12)',
                      borderWidth: 1,
                      borderColor: accentColor,
                    },
                  ]}
                >
                  <Ionicons name="create-outline" size={13} color={accentColor} />
                  <AppText variant="caption" weight="bold" style={{ color: accentColor }}>
                    Admin: Edit Info & Map
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ─── 2. School Website URL Card (Database Field) ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="globe-outline" size={18} color={colors.brand} />
            <AppText variant="subheading" weight="extrabold">
              Official Website
            </AppText>
          </View>

          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Open school website"
            onPress={handleOpenWebsite}
            activeOpacity={0.82}
            style={[
              styles.websiteCard,
              {
                backgroundColor: colors.surface,
                borderColor: websiteUrl ? colors.brand : colors.border,
              },
            ]}
          >
            <LinearGradient
              colors={
                websiteUrl
                  ? [isDark ? 'rgba(91, 63, 209, 0.12)' : 'rgba(99, 102, 241, 0.08)', 'transparent']
                  : ['transparent', 'transparent']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.websiteCardContent}>
              <View
                style={[
                  styles.websiteIconBadge,
                  {
                    backgroundColor: websiteUrl ? colors.brandSoft : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons
                  name={websiteUrl ? 'earth' : 'globe-outline'}
                  size={24}
                  color={websiteUrl ? colors.brand : colors.textMuted}
                />
              </View>

              <View style={{ flex: 1 }}>
                <AppText variant="label" weight="extrabold" style={{ color: colors.text }}>
                  {websiteUrl ? 'Visit School Website' : 'Official Portal Not Listed'}
                </AppText>
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    color: websiteUrl ? colors.brand : colors.textMuted,
                    marginTop: 2,
                    fontWeight: '600',
                  }}
                >
                  {websiteUrl || 'No website link recorded in the database'}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 4, fontSize: 11 }}>
                  {websiteUrl
                    ? 'Tap to explore admissions, programs, faculties & official notices'
                    : 'Check campus noticeboards or administration for link'}
                </AppText>
              </View>

              {websiteUrl ? (
                <View style={[styles.arrowCircle, { backgroundColor: colors.brand }]}>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── 3. School Information Section ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
            <AppText variant="subheading" weight="extrabold">
              About & Campus Info
            </AppText>
          </View>

          {/* About Text Card */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="body" style={{ lineHeight: 22, color: colors.text }}>
              {aboutText}
            </AppText>
          </View>

          {/* Quick Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Institution Category */}
            <View
              style={[
                styles.gridTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.tileIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="library-outline" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="overline" tone="muted">
                  CATEGORY
                </AppText>
                <AppText variant="caption" weight="bold" numberOfLines={1}>
                  {typeDisplay}
                </AppText>
              </View>
            </View>

            {/* Campus Scale / Tier */}
            <View
              style={[
                styles.gridTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.tileIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="people-outline" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="overline" tone="muted">
                  COMMUNITY
                </AppText>
                <AppText variant="caption" weight="bold" numberOfLines={1}>
                  {tierDisplay}
                </AppText>
              </View>
            </View>

            {/* Administration / Contact Person */}
            {institution?.contact_name ? (
              <View
                style={[
                  styles.gridTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.tileIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="person-outline" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="overline" tone="muted">
                    {institution.contact_title ? institution.contact_title.toUpperCase() : 'ADMINISTRATION'}
                  </AppText>
                  <AppText variant="caption" weight="bold" numberOfLines={1}>
                    {institution.contact_name}
                  </AppText>
                </View>
              </View>
            ) : null}

            {/* Official Email */}
            {institution?.contact_email ? (
              <TouchableOpacity
                onPress={() => handleOpenEmail(institution.contact_email)}
                activeOpacity={0.7}
                style={[
                  styles.gridTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.tileIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="mail-outline" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="overline" tone="muted">
                    EMAIL
                  </AppText>
                  <AppText variant="caption" weight="bold" numberOfLines={1} style={{ color: '#3B82F6' }}>
                    {institution.contact_email}
                  </AppText>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Official Phone */}
            {institution?.contact_phone ? (
              <TouchableOpacity
                onPress={() => handleOpenPhone(institution.contact_phone)}
                activeOpacity={0.7}
                style={[
                  styles.gridTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.tileIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                  <Ionicons name="call-outline" size={18} color="#A855F7" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="overline" tone="muted">
                    PHONE
                  </AppText>
                  <AppText variant="caption" weight="bold" numberOfLines={1} style={{ color: '#A855F7' }}>
                    {institution.contact_phone}
                  </AppText>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ─── 4. Map Location Area (Leaflet Interactive Map) ─── */}
        <View style={styles.sectionContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="map-outline" size={18} color={colors.brand} />
              <AppText variant="subheading" weight="extrabold">
                Campus Map & Location
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isSchoolAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    router.push(href(`/institution/edit?id=${institution?.id || id}`));
                  }}
                  style={[
                    styles.soonBadge,
                    {
                      backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)',
                      borderColor: accentColor,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Ionicons name="pencil" size={11} color={accentColor} />
                  <AppText variant="overline" weight="bold" style={{ fontSize: 9, color: accentColor }}>
                    EDIT LOCATION
                  </AppText>
                </TouchableOpacity>
              )}

              <View style={[styles.soonBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name="location" size={12} color="#10B981" />
                <AppText variant="overline" weight="bold" style={{ fontSize: 9, color: '#10B981' }}>
                  LEAFLET MAP
                </AppText>
              </View>
            </View>
          </View>

          {/* Real Leaflet Map Viewport */}
          <View
            style={[
              styles.mapCanvas,
              {
                height: 250,
                backgroundColor: isDark ? '#141226' : '#E2E8F0',
                borderColor: colors.border,
              },
            ]}
          >
            <LeafletMapView
              center={[
                institution?.latitude || (instName.toLowerCase().includes('iai') ? 4.051056 : 4.0543),
                institution?.longitude || (instName.toLowerCase().includes('iai') ? 9.708528 : 9.7337),
              ]}
              zoom={15}
              markers={[
                {
                  id: 'school-main',
                  coordinate: [
                    institution?.latitude || (instName.toLowerCase().includes('iai') ? 4.051056 : 4.0543),
                    institution?.longitude || (instName.toLowerCase().includes('iai') ? 9.708528 : 9.7337),
                  ],
                  title: instName,
                  description:
                    institution?.address ||
                    (instName.toLowerCase().includes('iai')
                      ? 'IAI-Cameroun Centre de Douala, Akwa, Douala'
                      : `${institution?.city || 'Douala'}, ${institution?.country || 'Cameroon'}`),
                  type: 'school',
                  accentColor: accentColor,
                },
              ]}
              isDark={isDark}
              interactive={true}
              showControls={false}
            />

            {/* Floating Top Chip */}
            <View
              style={[
                styles.mapFloatingBadge,
                {
                  backgroundColor: isDark ? 'rgba(20, 16, 44, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="navigate-circle" size={14} color={colors.brand} />
              <AppText variant="caption" weight="bold">
                {institution?.city || 'Douala'}, {institution?.country || 'Cameroon'}
              </AppText>
            </View>

            {/* Bottom Address & Directions Card */}
            <View
              style={[
                styles.mapBottomCard,
                {
                  backgroundColor: isDark ? 'rgba(16, 12, 34, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 6 }}>
                <AppText variant="caption" weight="extrabold" numberOfLines={1}>
                  {instName}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1, fontSize: 11 }}>
                  {institution?.address ||
                    (instName.toLowerCase().includes('iai')
                      ? 'IAI-Cameroun Centre de Douala, Akwa'
                      : `${institution?.city || 'Douala'}, ${institution?.country || 'Cameroon'}`)}
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Get shortest road directions"
                  onPress={() => {
                    haptics.light();
                    router.push(href(`/institution/directions?id=${institution?.id || id}`));
                  }}
                  activeOpacity={0.8}
                  style={[styles.directionsBtn, { backgroundColor: colors.brand }]}
                >
                  <Ionicons name="navigate" size={14} color="#FFFFFF" />
                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11 }}>
                    Directions
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open in external maps"
                  onPress={handleOpenExternalMaps}
                  activeOpacity={0.7}
                  style={[
                    styles.directionsBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      paddingHorizontal: 8,
                    },
                  ]}
                >
                  <Ionicons name="open-outline" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 5. Bottom Return Button ─── */}
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Return to workspace"
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={[
              styles.backToPortalBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="arrow-back-outline" size={16} color={colors.text} />
            <AppText variant="label" weight="bold">
              Back to Campus Workspace
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroWrapper: {
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: 24,
  },
  heroGradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    opacity: 0.85,
  },
  heroContent: {
    paddingTop: 50,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  instTitle: {
    marginTop: 14,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  websiteCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#3A1E82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  websiteCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  websiteIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    elevation: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  gridTile: {
    flexGrow: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  tileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mapCanvas: {
    height: 220,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGridPattern: {
    ...StyleSheet.absoluteFill,
  },
  gridRoadHorizontal: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  gridRoadVertical: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
  },
  gridRoadDiagonal: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    left: '25%',
    right: '25%',
    borderWidth: 1,
    borderRadius: 60,
    opacity: 0.3,
  },
  mapPinAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  radarOuterRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    opacity: 0.35,
  },
  radarInnerRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  pinBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  mapFloatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  backToPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
});
