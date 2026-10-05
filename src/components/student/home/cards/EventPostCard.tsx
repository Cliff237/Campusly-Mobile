import { useState } from 'react';
import { Alert, Share, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { haptics } from '@/lib/haptics';
import { initialsFromName, relativeTime } from '@/lib/format';
import { parseDateInfo } from './postCardUtils';
import type { StudentFeedPost } from '@/lib/types/student';

interface EventPostCardProps {
  post: StudentFeedPost;
  canReact: boolean;
  canComment: boolean;
  canManage: boolean;
  onComment: (post: StudentFeedPost) => void;
  onDelete?: (post: StudentFeedPost) => void;
  onEdit?: (post: StudentFeedPost) => void;
  onLike?: (post: StudentFeedPost) => Promise<void> | void;
}

export function EventPostCard({
  post,
  canReact,
  canComment,
  canManage,
  onComment,
  onDelete,
  onEdit,
  onLike,
}: EventPostCardProps) {
  const [liked, setLiked] = useState(!!post.is_reacted);
  const [likeCount, setLikeCount] = useState(post.reactions_count);
  const [busy, setBusy] = useState(false);
  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const startDateStr = (post.metadata?.start_date as string) || (post.metadata?.event_date as string) || post.created_at;
  const dateInfo = parseDateInfo(startDateStr);
  const location = (post.metadata?.location as string) || (post.metadata?.venue as string) || 'Campus Amphitheatre';

  const sender = post.author_name || post.institution_name || 'Campusly';
  const role = post.author_actor ? post.author_actor.charAt(0).toUpperCase() + post.author_actor.slice(1) : 'Staff';

  const onShare = async () => {
    haptics.light();
    await Share.share({ message: `📅 ${post.title ? `${post.title}\n\n` : ''}${post.body}`.trim() });
  };

  const onMenu = () => {
    if (!canManage) return;
    haptics.medium();
    Alert.alert('Event options', undefined, [
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
        shadowColor: '#C2410C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      }}
    >
      {/* Top Banner (Warm Chocolate / Terracotta) */}
      <View style={{ backgroundColor: '#3B1C0B', padding: 18, position: 'relative' }}>
        {/* Subtle decorative confetti / dots */}
        <View style={{ position: 'absolute', top: 12, right: 90, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FBBF24', opacity: 0.6 }} />
        <View style={{ position: 'absolute', top: 38, right: 60, width: 4, height: 4, borderRadius: 2, backgroundColor: '#F87171', opacity: 0.5 }} />
        <View style={{ position: 'absolute', top: 22, right: 35, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FB923C', opacity: 0.5 }} />

        <View style={{ flexDirection: 'row', gap: 14 }}>
          {/* Calendar Badge */}
          <View
            style={{
              width: 58,
              borderRadius: 14,
              overflow: 'hidden',
              backgroundColor: '#1E1B2E',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.14)',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: '100%',
                backgroundColor: '#C2410C',
                paddingVertical: 3,
                alignItems: 'center',
              }}
            >
              <AppText variant="caption" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 10 }}>
                {dateInfo.month}
              </AppText>
            </View>
            <View style={{ paddingVertical: 6, alignItems: 'center' }}>
              <AppText variant="subheading" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 24 }}>
                {dateInfo.day}
              </AppText>
              <AppText variant="caption" style={{ color: '#A59EC3', fontSize: 10 }}>
                {dateInfo.weekday}
              </AppText>
            </View>
          </View>

          {/* Right Header Content */}
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    backgroundColor: 'rgba(251, 146, 60, 0.2)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Ionicons name="calendar" size={13} color="#FB923C" />
                  <AppText variant="overline" weight="extrabold" style={{ color: '#FDBA74', letterSpacing: 1.1 }}>
                    EVENT
                  </AppText>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <AppText variant="caption" weight="bold" style={{ color: '#FEE2E2', fontSize: 11 }}>
                  {dateInfo.daysRemainingText}
                </AppText>
              </View>
            </View>

            <AppText
              variant="heading"
              weight="extrabold"
              style={{ color: '#FED7AA', fontSize: 18, lineHeight: 23, letterSpacing: -0.2, marginTop: 4 }}
              numberOfLines={2}
            >
              {post.title || `Campus Event · ${dateInfo.formatted}`}
            </AppText>
          </View>
        </View>

        {/* Location Tag */}
        <View style={{ marginTop: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              gap: 6,
            }}
          >
            <Ionicons name="location-outline" size={15} color="#FDBA74" />
            <AppText variant="caption" weight="medium" style={{ color: '#FED7AA' }}>
              {location}
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
                borderColor: '#FB923C',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="label" weight="extrabold" style={{ color: '#FB923C' }}>
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
                  backgroundColor: '#2A1205',
                  borderWidth: 1,
                  borderColor: 'rgba(251, 146, 60, 0.3)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <AppText variant="caption" weight="semibold" style={{ color: '#FB923C' }}>
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
