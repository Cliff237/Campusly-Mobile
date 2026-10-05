import { useState } from 'react';
import { Alert, Share, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { haptics } from '@/lib/haptics';
import { initialsFromName, relativeTime } from '@/lib/format';
import { parseDateInfo } from './postCardUtils';
import type { StudentFeedPost } from '@/lib/types/student';

interface AchievementPostCardProps {
  post: StudentFeedPost;
  canReact: boolean;
  canComment: boolean;
  canManage: boolean;
  onComment: (post: StudentFeedPost) => void;
  onDelete?: (post: StudentFeedPost) => void;
  onEdit?: (post: StudentFeedPost) => void;
  onLike?: (post: StudentFeedPost) => Promise<void> | void;
}

export function AchievementPostCard({
  post,
  canReact,
  canComment,
  canManage,
  onComment,
  onDelete,
  onEdit,
  onLike,
}: AchievementPostCardProps) {
  const [liked, setLiked] = useState(!!post.is_reacted);
  const [likeCount, setLikeCount] = useState(post.reactions_count);
  const [busy, setBusy] = useState(false);
  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const achievementDateStr = (post.metadata?.achievement_date as string) || post.created_at;
  const dateInfo = parseDateInfo(achievementDateStr);

  const sender = post.author_name || post.institution_name || 'Campusly';
  const role = post.author_actor ? post.author_actor.charAt(0).toUpperCase() + post.author_actor.slice(1) : 'Teacher';
  const tagTitle = post.tags?.[0] ? post.tags[0].replace(/^#/, '') : post.course_name || 'Campus Win';

  const onShare = async () => {
    haptics.light();
    await Share.share({ message: `🏆 ${post.title ? `${post.title}\n\n` : ''}${post.body}`.trim() });
  };

  const onMenu = () => {
    if (!canManage) return;
    haptics.medium();
    Alert.alert('Achievement options', undefined, [
      ...(onEdit ? [{ text: 'Edit post', onPress: () => onEdit(post) }] : []),
      ...(onDelete ? [{ text: 'Delete post', style: 'destructive' as const, onPress: () => onDelete(post) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLike = async () => {
    if (!canReact || !post.allow_reactions || busy || !onLike) return;
    const nextLiked = !liked;
    const previousLiked = liked;
    const previousCount = likeCount;
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    scale.value = withSpring(1.25, { damping: 8 }, () => {
      scale.value = withSpring(1);
    });
    haptics.light();
    setBusy(true);
    try {
      await onLike({ ...post, is_reacted: nextLiked, reactions_count: previousCount + (nextLiked ? 1 : -1) });
    } catch {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#171229',
        borderWidth: 1,
        borderColor: '#2E2650',
        elevation: 3,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      }}
    >
      {/* Top Banner (Warm Gold / Amber) */}
      <View style={{ backgroundColor: '#FBBF24', padding: 18, position: 'relative' }}>
        {/* Subtle decorative sparkle elements */}
        <View style={{ position: 'absolute', top: 12, right: 80, opacity: 0.5 }}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </View>
        <View style={{ position: 'absolute', top: 28, right: 30, opacity: 0.4 }}>
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        </View>
        <View style={{ position: 'absolute', bottom: 18, right: 25, opacity: 0.35 }}>
          <Ionicons name="sparkles" size={14} color="#FFFFFF" />
        </View>

        {/* Trophy icon and label row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 4,
              shadowColor: '#B45309',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
            }}
          >
            <Ionicons name="trophy" size={26} color="#D97706" />
          </View>

          <View style={{ flex: 1 }}>
            <AppText variant="overline" weight="extrabold" style={{ color: '#78350F', letterSpacing: 1.2 }}>
              ACHIEVEMENT
            </AppText>
            <AppText
              variant="heading"
              weight="extrabold"
              style={{ color: '#451A03', fontSize: 19, lineHeight: 24, letterSpacing: -0.3, marginTop: 2 }}
            >
              {post.title || 'Victory & Recognition'}
            </AppText>
          </View>
        </View>

        {/* Chips Row (Category/Competition + Date) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              gap: 6,
            }}
          >
            <Ionicons name="ribbon-outline" size={15} color="#92400E" />
            <AppText variant="caption" weight="bold" style={{ color: '#78350F' }}>
              {tagTitle}
            </AppText>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              gap: 6,
            }}
          >
            <Ionicons name="calendar-outline" size={14} color="#92400E" />
            <AppText variant="caption" weight="bold" style={{ color: '#78350F' }}>
              {dateInfo.formatted}
            </AppText>
          </View>
        </View>
      </View>

      {/* Lower Section (Author, Description, Tags, Actions) */}
      <View style={{ backgroundColor: '#171229', padding: 18 }}>
        {/* Author info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: '#251C4D',
                borderWidth: 1.5,
                borderColor: '#FBBF24',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="label" weight="extrabold" style={{ color: '#FBBF24' }}>
                {initialsFromName(sender)}
              </AppText>
            </View>
            <View>
              <AppText variant="label" weight="bold" style={{ color: '#F5F2FF' }}>
                {sender}
              </AppText>
              <AppText variant="caption" style={{ color: '#A59EC3', marginTop: 1 }}>
                {relativeTime(post.created_at)} · {role}
              </AppText>
            </View>
          </View>

          {canManage ? (
            <TouchableOpacity onPress={onMenu} style={{ padding: 6 }}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#A59EC3" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Body Text */}
        <AppText variant="body" style={{ color: '#D3CCEB', lineHeight: 22 }}>
          {post.body}
        </AppText>

        {/* Hashtags */}
        {post.tags && post.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {post.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: '#382307',
                  borderWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.3)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <AppText variant="caption" weight="semibold" style={{ color: '#FBBF24' }}>
                  #{tag.replace(/^#/, '')}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {/* Footer Actions */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: '#2E2650',
          }}
        >
          <TouchableOpacity
            onPress={handleLike}
            disabled={!canReact}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Animated.View style={heartStyle}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#FF6B84' : '#A59EC3'} />
            </Animated.View>
            <AppText variant="caption" weight="semibold" style={{ color: liked ? '#FF6B84' : '#A59EC3' }}>
              {likeCount > 0 ? likeCount : 'Like'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onComment(post)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#A59EC3" />
            <AppText variant="caption" weight="semibold" style={{ color: '#A59EC3' }}>
              {post.comments_count > 0 ? `${post.comments_count} Comments` : 'Comment'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onShare}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="share-outline" size={20} color="#A59EC3" />
            <AppText variant="caption" weight="semibold" style={{ color: '#A59EC3' }}>
              Share
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
