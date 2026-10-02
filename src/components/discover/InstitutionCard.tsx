// components/discover/InstitutionCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { DirectoryInstitution } from '@/lib/api/discover/explorer';
import { AppText } from '@/ui/AppText';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { PillButton } from '@/ui/PillButton';
import { Tag } from '@/ui/Tag';
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

/** "12.4K followers · 14 posts" — plain text so it reads at a glance and survives narrow screens. */
function Stats({ followers, posts }: { followers: string; posts: string }) {
  return (
    <AppText
      variant="caption"
      tone="muted"
      accessibilityLabel={`${followers} followers, ${posts} posts`}
      style={{ flexShrink: 1, textAlign: 'right', fontSize: 13 }}
    >
      <AppText variant="caption" weight="bold" tone="secondary" style={{ fontSize: 13 }}>{followers}</AppText> followers
      {'  ·  '}
      <AppText variant="caption" weight="bold" tone="secondary" style={{ fontSize: 13 }}>{posts}</AppText> posts
    </AppText>
  );
}

export function InstitutionCard({ institution, isFollowing, isBound, baseActor, onFollow, onView }: InstitutionCardProps) {
  const { colors, shadow } = useAppTheme();
  const coverUrl = (institution as any).cover_image_url as string | undefined;
  const posts = institution.post_count ?? institution.public_post_count ?? 0;

  return (
    <View
      style={{
        marginBottom: 14,
        overflow: 'hidden',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        boxShadow: shadow.sm,
      }}
    >
      {/* main zone — opens the institution */}
      <Pressable
        onPress={onView}
        accessibilityRole="button"
        accessibilityLabel={`${institution.name}, ${institution.city}, ${institution.country}`}
        style={({ pressed }) => ({ backgroundColor: pressed ? colors.brandSoft : 'transparent' })}
      >
        {coverUrl ? <Image source={{ uri: coverUrl }} style={{ width: '100%', height: 96 }} contentFit="cover" /> : null}

        <View style={{ padding: 16, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <InstitutionMark
              name={institution.name}
              color={institution.brand_accent_color}
              logoUrl={institution.logo_url}
              size={58}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" numberOfLines={2}>
                {institution.name}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.textSubtle} />
                <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {institution.city}, {institution.country}
                </AppText>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <Tag label={TYPE_LABELS[institution.type] ?? institution.type} />
            {baseActor ? (
              <Tag tone="success" icon="checkmark-circle" label={ACTOR_LABELS[baseActor] || baseActor} />
            ) : null}
          </View>
        </View>
      </Pressable>

      <View style={{ height: StyleSheet.hairlineWidth, marginHorizontal: 16, backgroundColor: colors.border }} />

      {/*
        Footer zone. Follow sits on the left on purpose: the floating "Enter code" button lives bottom-right,
        so whatever scrolls under it there is read-only text, never a control. The stats area is tappable too
        (it opens the institution) so the card has no dead spots.
      */}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', paddingLeft: 16 }}>
        <View style={{ justifyContent: 'center', paddingVertical: 12 }}>
          <PillButton
            title={isFollowing ? 'Following' : 'Follow'}
            icon={isFollowing ? 'checkmark' : 'add'}
            variant={isFollowing ? 'outline' : 'tonal'}
            accessibilityLabel={`${isFollowing ? 'Unfollow' : 'Follow'} ${institution.name}`}
            onPress={() => {
              haptics.light();
              onFollow();
            }}
          />
        </View>
        <Pressable
          onPress={onView}
          accessible={false}
          importantForAccessibility="no"
          style={({ pressed }) => ({
            flex: 1,
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingLeft: 12,
            paddingRight: 16,
            backgroundColor: pressed ? colors.brandSoft : 'transparent',
          })}
        >
          <Stats followers={formatCount(institution.follower_count)} posts={formatCount(posts)} />
        </Pressable>
      </View>
    </View>
  );
}
