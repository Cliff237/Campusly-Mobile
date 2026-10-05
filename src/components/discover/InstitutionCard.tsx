// components/discover/InstitutionCard.tsx — Redesigned with modern social-campus aesthetics
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { DirectoryInstitution } from '@/lib/api/discover/explorer';
import { AppText } from '@/ui/AppText';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { safeColor } from '@/ui/color';
import { palette } from '@/ui/tokens';
import { useAppTheme } from '@/ui/useAppTheme';
import { ACTOR_LABELS, formatCount, TYPE_LABELS } from './roles';

interface InstitutionCardProps {
  institution: DirectoryInstitution;
  isFollowing: boolean;
  isBound: boolean;
  baseActor?: string;
  onFollow: () => void;
  onView: () => void;
}

export function InstitutionCard({
  institution,
  isFollowing,
  isBound,
  baseActor,
  onFollow,
  onView,
}: InstitutionCardProps) {
  const { colors, isDark } = useAppTheme();
  const coverUrl = (institution as any).cover_image_url as string | undefined;
  const posts = institution.post_count ?? institution.public_post_count ?? 0;
  const brandAccent = safeColor(institution.brand_accent_color, palette.violet[600]);

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#18122B' : '#FFFFFF',
          borderColor: isDark ? '#2E2250' : '#E8E3F7',
          shadowColor: '#43299F',
          shadowOpacity: isDark ? 0.45 : 0.09,
        },
      ]}
    >
      {/* ─── Hero Banner ─── */}
      <Pressable
        onPress={onView}
        accessibilityRole="button"
        accessibilityLabel={`View ${institution.name}`}
        style={styles.bannerContainer}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient
            colors={[brandAccent, '#43299F', '#2B1D66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerImage}
          >
            {/* Subtle decorative circles for depth when there's no photo */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </LinearGradient>
        )}

        {/* Gradient scrim at bottom of banner for smooth contrast */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Institution Type Badge on top right of banner */}
        <View style={styles.bannerBadge}>
          <AppText weight="bold" style={styles.bannerBadgeText}>
            {TYPE_LABELS[institution.type] ?? institution.type ?? 'Institution'}
          </AppText>
        </View>
      </Pressable>

      {/* ─── Card Body ─── */}
      <View style={styles.body}>
        {/* Floating Logo Row */}
        <View style={styles.floatingHeaderRow}>
          <Pressable onPress={onView} style={[styles.floatingLogoWrap, { borderColor: isDark ? '#18122B' : '#FFFFFF' }]}>
            <InstitutionMark
              name={institution.name}
              color={institution.brand_accent_color}
              logoUrl={institution.logo_url}
              size={56}
            />
          </Pressable>

          {/* Right Header Badges: Enrolled / Follow Button */}
          <View style={styles.headerActions}>
            {isBound && baseActor ? (
              <View style={[styles.enrolledBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={13} color={isDark ? '#34D399' : '#059669'} />
                <AppText weight="bold" style={{ fontSize: 11.5, color: isDark ? '#34D399' : '#059669' }}>
                  {ACTOR_LABELS[baseActor] || 'Enrolled'}
                </AppText>
              </View>
            ) : null}

            {/* Follow / Following Button with rich solid background colors */}
            <Pressable
              onPress={() => {
                haptics.light();
                onFollow();
              }}
              accessibilityRole="button"
              accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
              style={({ pressed }) => [
                styles.followBtn,
                isFollowing
                  ? {
                      backgroundColor: isDark ? '#261C4C' : '#EDE8FF',
                      borderColor: isDark ? '#463777' : '#C7BAF8',
                    }
                  : {
                      backgroundColor: colors.brand,
                      borderColor: colors.brand,
                      elevation: 2,
                      shadowColor: colors.brand,
                      shadowOpacity: 0.3,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 4,
                    },
                { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Ionicons
                name={isFollowing ? 'checkmark-sharp' : 'add'}
                size={14}
                color={isFollowing ? colors.brand : '#FFFFFF'}
              />
              <AppText
                weight="bold"
                style={{
                  fontSize: 12.5,
                  color: isFollowing ? colors.brand : '#FFFFFF',
                }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Institution Title & Details */}
        <Pressable onPress={onView} style={styles.infoSection}>
          <View style={styles.titleRow}>
            <AppText
              variant="subheading"
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{ fontSize: 16, lineHeight: 22, fontWeight: '700' }}
            >
              {institution.name}
            </AppText>
          </View>

          {/* Location row */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSubtle} />
            <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 12.5, flexShrink: 1 }}>
              {institution.city ? `${institution.city}, ` : ''}{institution.country || 'Campus'}
            </AppText>
          </View>
        </Pressable>

        {/* ─── Metrics Strip ─── */}
        <View style={[styles.statsStrip, { backgroundColor: isDark ? '#1F1738' : '#F7F5FC' }]}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={14} color={colors.brand} />
            <AppText variant="caption" weight="bold" style={{ fontSize: 12.5, color: colors.text }}>
              {formatCount(institution.follower_count || 0)}
            </AppText>
            <AppText variant="caption" tone="muted" style={{ fontSize: 11.5 }}>
              Followers
            </AppText>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#2E2250' : '#E5E0F4' }]} />

          <View style={styles.statItem}>
            <Ionicons name="newspaper-outline" size={14} color={colors.brand} />
            <AppText variant="caption" weight="bold" style={{ fontSize: 12.5, color: colors.text }}>
              {formatCount(posts)}
            </AppText>
            <AppText variant="caption" tone="muted" style={{ fontSize: 11.5 }}>
              Posts
            </AppText>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#2E2250' : '#E5E0F4' }]} />

          <Pressable
            onPress={onView}
            style={({ pressed }) => [
              styles.viewCampusBtn,
              {
                backgroundColor: pressed ? colors.brandPressed : colors.brand,
              },
            ]}
          >
            <AppText weight="bold" style={{ fontSize: 12, color: '#FFFFFF' }}>
              Explore
            </AppText>
            <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  bannerContainer: {
    width: '100%',
    height: 98,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  decorativeCircle1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    left: '40%',
    bottom: -30,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bannerBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 12, 32, 0.65)',
  },
  bannerBadgeText: {
    fontSize: 10.5,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 0,
  },
  floatingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -28,
    marginBottom: 8,
  },
  floatingLogoWrap: {
    borderRadius: 20,
    borderWidth: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  infoSection: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDivider: {
    width: 1,
    height: 16,
  },
  viewCampusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
});
