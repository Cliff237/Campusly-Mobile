// src/components/explorer/ExplorerHero.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCount } from '@/components/discover/roles';
import { haptics } from '@/lib/haptics';
import type { Institution } from '@/lib/types/explorer';
import { CATEGORY_LABELS } from '@/lib/types/explorer';
import { AppText } from '@/ui/AppText';
import { HeroBackdrop } from '@/ui/brand/HeroBackdrop';
import { CircleButton } from '@/ui/CircleButton';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { COLUMN } from '@/ui/layout';
import { palette } from '@/ui/tokens';
import { useAppTheme } from '@/ui/useAppTheme';

interface ExplorerHeroProps {
  institution: Institution;
  isFollowing: boolean;
  onFollow: () => void;
}

/** Translucent label on the violet hero. */
function HeroPill({ icon, label }: { icon?: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(255,255,255,0.12)',
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color="#FFFFFF" /> : null}
      <AppText weight="semibold" color="#FFFFFF" numberOfLines={1} style={{ fontSize: 13, lineHeight: 18 }}>
        {label}
      </AppText>
    </View>
  );
}

export function ExplorerHero({ institution, isFollowing, onFollow }: ExplorerHeroProps) {
  const { colors, shadow } = useAppTheme();
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    haptics.light();
    try {
      await Share.share({
        message: `Check out ${institution.name} on Campusly!`,
        url: `campusly://explorer/${institution.id}`, // Deep link
      });
    } catch (error) {
      console.error('Share failed', error);
    }
  };

  const handleWebsite = () => {
    if (institution.website) {
      haptics.light();
      Linking.openURL(institution.website);
    }
  };

  const stats = [
    typeof institution.follower_count === 'number' ? { label: 'Followers', value: formatCount(institution.follower_count) } : null,
    typeof institution.public_post_count === 'number' ? { label: 'Posts', value: formatCount(institution.public_post_count) } : null,
    typeof institution.student_count === 'number' ? { label: 'Students', value: formatCount(institution.student_count) } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  return (
    <View>
      <View style={{ overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <LinearGradient
          colors={colors.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <HeroBackdrop variant="tab" topInset={insets.top} visibleHeight={260} bottomClearance={40} />

        {/* top padding leaves room for the floating back button */}
        <View style={{ paddingTop: insets.top + 68, paddingHorizontal: 20, paddingBottom: stats.length ? 58 : 28 }}>
          <View style={COLUMN}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ padding: 3, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <InstitutionMark
                  name={institution.name}
                  color={institution.brand_color}
                  logoUrl={institution.logo_url}
                  size={78}
                  radius={25}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="heading" tone="hero" accessibilityRole="header" numberOfLines={3}>
                  {institution.name}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <HeroPill icon="location-outline" label={`${institution.city}, ${institution.region}`} />
              <HeroPill label={CATEGORY_LABELS[institution.category] || institution.category} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 }}>
              <Pressable
                onPress={onFollow}
                accessibilityRole="button"
                accessibilityState={{ selected: isFollowing }}
                accessibilityLabel={isFollowing ? 'Following. Tap to unfollow' : 'Follow'}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: isFollowing ? 'rgba(255,255,255,0.4)' : '#FFFFFF',
                  backgroundColor: isFollowing ? 'rgba(255,255,255,0.14)' : '#FFFFFF',
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                <Ionicons
                  name={isFollowing ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFollowing ? palette.rose[400] : palette.violet[700]}
                />
                <AppText variant="button" color={isFollowing ? '#FFFFFF' : palette.violet[700]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </AppText>
              </Pressable>

              <CircleButton
                icon="share-social-outline"
                variant="glass"
                size={50}
                accessibilityLabel="Share this institution"
                onPress={handleShare}
              />
              {institution.website ? (
                <CircleButton
                  icon="globe-outline"
                  variant="glass"
                  size={50}
                  accessibilityLabel="Open website"
                  onPress={handleWebsite}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* figures float over the lower edge of the hero */}
      {stats.length > 0 ? (
        <View style={[COLUMN, { paddingHorizontal: 20, marginTop: -34 }]}>
          <View
            style={{
              flexDirection: 'row',
              paddingVertical: 14,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              boxShadow: shadow.md,
            }}
          >
            {stats.map((s, i) => (
              <View
                key={s.label}
                accessible
                accessibilityLabel={`${s.value} ${s.label}`}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderLeftWidth: i === 0 ? 0 : 1,
                  borderLeftColor: colors.border,
                }}
              >
                <AppText variant="heading" style={{ fontSize: 20, lineHeight: 26 }}>{s.value}</AppText>
                <AppText variant="caption" tone="muted">{s.label}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
