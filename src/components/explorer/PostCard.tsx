// src/components/explorer/PostCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import type { PublicPost } from '@/lib/types/explorer';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { monthDayBadge, postTypeTheme } from '@/components/feed/postTypeTheme';

interface PostCardProps {
  post: PublicPost;
  onReact: () => void;
}

/**
 * Public feed card. Shares the per-type ribbon / detail-panel language with
 * the signed-in home feed (FeedPostCard), so event, achievement and
 * opportunity posts look the same before and after sign-in.
 */
export function PostCard({ post, onReact }: PostCardProps) {
  const { colors, shadow } = useAppTheme();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const t = postTypeTheme(post.category as never, isDark);

  // Format date (e.g., "Oct 24, 2023")
  const formattedDate = new Date(post.published_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const meta = (post.metadata ?? {}) as Record<string, unknown>;
  const eventBadge = post.category === 'event' ? monthDayBadge(meta.start_date) : null;
  const hasDetail = post.category === 'event' || post.category === 'opportunity' || post.category === 'achievement';

  return (
    <View
      style={{
        marginBottom: 14,
        overflow: 'hidden',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: isDark ? colors.border : t.soft,
        backgroundColor: colors.surface,
        boxShadow: shadow.sm,
      }}
    >
      {/* Type ribbon — colour + icon identify the category at a glance. */}
      <LinearGradient
        colors={t.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <Animated.View
          entering={FadeInRight.duration(280)}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={t.icon} size={16} color="#FFFFFF" />
        </Animated.View>
        <AppText
          weight="bold"
          color="#FFFFFF"
          style={{ flex: 1, fontSize: 11.5, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' }}
          numberOfLines={1}
        >
          {t.ribbon}
        </AppText>
        {eventBadge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
            <AppText weight="bold" color="#FFFFFF" style={{ fontSize: 10.5, lineHeight: 13, letterSpacing: 0.6 }}>
              {eventBadge.month}
            </AppText>
            <AppText weight="extrabold" color="#FFFFFF" style={{ fontSize: 14, lineHeight: 16 }}>
              {eventBadge.day}
            </AppText>
          </View>
        ) : null}
      </LinearGradient>

      {/* Media (if exists) */}
      {post.media && post.media.length > 0 && post.media[0].type === 'image' && (
        <Image source={{ uri: post.media[0].url }} style={{ width: '100%', aspectRatio: 16 / 9 }} contentFit="cover" />
      )}
      {/* Note: For video, you would use <Video> from 'expo-av' here */}

      <View style={{ padding: 16 }}>
        {/* Header: publisher & date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} />
            <AppText variant="label" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {post.author_name}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={{ marginLeft: 8 }}>{formattedDate}</AppText>
        </View>

        {/* Content */}
        {post.title ? (
          <AppText variant="subheading" numberOfLines={2} style={{ marginTop: 12 }}>
            {post.title}
          </AppText>
        ) : null}
        <AppText tone="secondary" numberOfLines={4} style={{ marginTop: post.title ? 6 : 12, lineHeight: 23 }}>
          {post.body}
        </AppText>

        {/* Type-specific detail panel */}
        {hasDetail ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 16,
              backgroundColor: t.soft,
              borderLeftWidth: 3,
              borderLeftColor: t.accent,
              gap: 8,
            }}
          >
            {post.category === 'event' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="calendar" size={15} color={t.onSoft} />
                  <AppText weight="bold" color={t.onSoft} style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Event details
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={14} color={t.onSoft} />
                  <AppText variant="caption" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {String(meta.start_date || 'Date to be announced')}{meta.start_time ? ` at ${String(meta.start_time)}` : ''}
                  </AppText>
                </View>
                {meta.location ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="location-outline" size={14} color={t.onSoft} />
                    <AppText variant="caption" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {String(meta.location)}
                    </AppText>
                  </View>
                ) : null}
              </>
            ) : post.category === 'opportunity' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="hourglass-outline" size={14} color={t.onSoft} />
                <AppText variant="caption" weight="semibold" style={{ flexShrink: 1 }}>
                  Apply by {String(meta.application_deadline || 'deadline not set')}
                </AppText>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="trophy" size={17} color={t.accent} />
                <View style={{ flexShrink: 1 }}>
                  <AppText weight="bold" color={t.onSoft} style={{ fontSize: 12, lineHeight: 15 }}>
                    Celebrating a campus win
                  </AppText>
                  {meta.achievement_date ? (
                    <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                      {String(meta.achievement_date)}
                    </AppText>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        ) : null}

        {/* Footer: Reactions & Comments */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Pressable
            onPress={() => { haptics.light(); onReact(); }}
            accessibilityRole="button"
            accessibilityState={{ selected: post.is_reacted }}
            accessibilityLabel={`${post.is_reacted ? 'Remove reaction' : 'React'}. ${post.reactions_count} reactions`}
            hitSlop={{ top: 6, bottom: 6, right: 12 }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              minHeight: 44,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons
              name={post.is_reacted ? 'heart' : 'heart-outline'}
              size={22}
              color={post.is_reacted ? colors.danger : colors.textMuted}
            />
            <AppText variant="label" tone={post.is_reacted ? 'danger' : 'muted'}>
              {post.reactions_count}
            </AppText>
          </Pressable>

          <View
            accessible
            accessibilityLabel={`${post.comments_count} comments`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            <AppText variant="label" tone="muted">{post.comments_count}</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}
