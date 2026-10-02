// src/components/explorer/PostCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { PublicPost } from '@/lib/types/explorer';
import { POST_CATEGORY_LABELS, POST_CATEGORY_ICONS } from '@/lib/types/explorer';
import { AppText } from '@/ui/AppText';
import { Tag, type TagTone } from '@/ui/Tag';
import { useAppTheme } from '@/ui/useAppTheme';

interface PostCardProps {
  post: PublicPost;
  onReact: () => void;
}

/** Post categories map onto the shared, contrast-checked tag tones. */
const CATEGORY_TONE: Record<string, TagTone> = {
  general: 'neutral',
  event: 'warning',
  academic: 'info',
  achievement: 'success',
  opportunity: 'brand',
};

export function PostCard({ post, onReact }: PostCardProps) {
  const { colors, shadow } = useAppTheme();
  const categoryIcon = POST_CATEGORY_ICONS[post.category] || 'information-circle-outline';
  const categoryLabel = POST_CATEGORY_LABELS[post.category] || 'General';

  // Format date (e.g., "Oct 24, 2023")
  const formattedDate = new Date(post.published_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

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
      {/* Media (if exists) */}
      {post.media && post.media.length > 0 && post.media[0].type === 'image' && (
        <Image source={{ uri: post.media[0].url }} style={{ width: '100%', aspectRatio: 16 / 9 }} contentFit="cover" />
      )}
      {/* Note: For video, you would use <Video> from 'expo-av' here */}

      <View style={{ padding: 16 }}>
        {/* Header: Category & Date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tag tone={CATEGORY_TONE[post.category] ?? 'neutral'} icon={categoryIcon} label={categoryLabel} />
          <AppText variant="caption" tone="muted">{formattedDate}</AppText>
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
