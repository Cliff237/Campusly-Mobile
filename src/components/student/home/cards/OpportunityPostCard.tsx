import { useState } from 'react';
import { Alert, Linking, Share, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { haptics } from '@/lib/haptics';
import { initialsFromName, relativeTime } from '@/lib/format';
import { extractAward, parseDateInfo, extractBullets } from './postCardUtils';
import type { StudentFeedPost } from '@/lib/types/student';

interface OpportunityPostCardProps {
  post: StudentFeedPost;
  canReact: boolean;
  canComment: boolean;
  canManage: boolean;
  onComment: (post: StudentFeedPost) => void;
  onDelete?: (post: StudentFeedPost) => void;
  onEdit?: (post: StudentFeedPost) => void;
  onLike?: (post: StudentFeedPost) => Promise<void> | void;
}

export function OpportunityPostCard({
  post,
  canReact,
  canComment,
  canManage,
  onComment,
  onDelete,
  onEdit,
  onLike,
}: OpportunityPostCardProps) {
  const [liked, setLiked] = useState(!!post.is_reacted);
  const [likeCount, setLikeCount] = useState(post.reactions_count);
  const [busy, setBusy] = useState(false);
  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const deadlineStr = (post.metadata?.application_deadline as string) || (post.metadata?.deadline as string);
  const dateInfo = parseDateInfo(deadlineStr);
  const award = extractAward(post);
  const externalLink = (post.metadata?.external_link as string) || (post.metadata?.link as string);
  const { mainText, bullets } = extractBullets(post.body);

  const sender = post.author_name || post.institution_name || 'Campusly';
  const role = post.author_actor ? post.author_actor.charAt(0).toUpperCase() + post.author_actor.slice(1) : 'Staff';

  const onShare = async () => {
    haptics.light();
    await Share.share({ message: `${post.title ? `${post.title}\n\n` : ''}${post.body}`.trim() });
  };

  const onMenu = () => {
    if (!canManage) return;
    haptics.medium();
    Alert.alert('Opportunity options', undefined, [
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
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      }}
    >
      {/* Top Banner (Deep Emerald) */}
      <View style={{ backgroundColor: '#064E3B', padding: 18, position: 'relative' }}>
        {/* Subtle decorative circles */}
        <View
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: 70,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            right: -30,
            top: -20,
            pointerEvents: 'none',
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: 110,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.05)',
            right: -70,
            top: -50,
            pointerEvents: 'none',
          }}
        />

        {/* Header bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="sparkles" size={14} color="#A7F3D0" />
            </View>
            <AppText variant="overline" weight="extrabold" style={{ color: '#FFFFFF', letterSpacing: 1.2 }}>
              OPPORTUNITY
            </AppText>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(254, 243, 199, 0.18)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(251, 191, 36, 0.4)',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FBBF24', marginRight: 6 }} />
            <AppText variant="caption" weight="bold" style={{ color: '#FEF3C7', fontSize: 11 }}>
              {dateInfo.daysRemainingText}
            </AppText>
          </View>
        </View>

        {/* Title */}
        <AppText
          variant="heading"
          weight="extrabold"
          style={{ color: '#FFFFFF', fontSize: 20, lineHeight: 27, letterSpacing: -0.3 }}
        >
          {post.title || 'Opportunity Announcement'}
        </AppText>

        {/* Award Highlight */}
        {award ? (
          <View style={{ marginTop: 14 }}>
            <AppText variant="overline" weight="bold" style={{ color: '#6EE7B7', letterSpacing: 1 }}>
              AWARD
            </AppText>
            <AppText variant="display" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 26, marginTop: 2 }}>
              {award}
            </AppText>
          </View>
        ) : null}

        {/* Progress Bar & Deadline */}
        <View style={{ marginTop: 14 }}>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${dateInfo.progressPercent}%`,
                height: '100%',
                borderRadius: 3,
                backgroundColor: '#FBBF24',
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <AppText variant="caption" weight="medium" style={{ color: '#D1FAE5' }}>
              {deadlineStr ? `Apply by ${dateInfo.formatted}` : 'Applications open'}
            </AppText>
            <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF' }}>
              {dateInfo.daysRemainingText}
            </AppText>
          </View>
        </View>

        {/* Bullet Highlights / Link */}
        {bullets.length > 0 || externalLink ? (
          <View style={{ marginTop: 14, gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.12)' }}>
            {bullets.slice(0, 2).map((bullet, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark-outline" size={17} color="#6EE7B7" />
                <AppText variant="caption" weight="medium" style={{ color: '#E1F6EE', flex: 1 }}>
                  {bullet}
                </AppText>
              </View>
            ))}

            {externalLink ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(externalLink.startsWith('http') ? externalLink : `https://${externalLink}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="link-outline" size={17} color="#6EE7B7" />
                <AppText variant="caption" weight="semibold" style={{ color: '#6EE7B7', textDecorationLine: 'underline', flex: 1 }}>
                  {externalLink.replace(/^https?:\/\//, '')}
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
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
                borderColor: '#6EE7B7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="label" weight="extrabold" style={{ color: '#6EE7B7' }}>
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
          {mainText}
        </AppText>

        {/* Hashtags */}
        {post.tags && post.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {post.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: '#072B1E',
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <AppText variant="caption" weight="semibold" style={{ color: '#6EE7B7' }}>
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
