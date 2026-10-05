import { useState, useEffect } from 'react';
import { Alert, Linking, Share, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { initialsFromName, relativeTime } from '@/lib/format';
import type { StudentFeedPost, StudentPostCategory } from '@/lib/types/student';

const CATEGORY_META: Record<
  StudentPostCategory,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  general: { label: 'General', icon: 'chatbubbles-outline', color: '#7357E6', bg: 'rgba(91, 63, 209, 0.12)' },
  event: { label: 'Event', icon: 'calendar-outline', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.12)' },
  opportunity: { label: 'Opportunity', icon: 'briefcase-outline', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  achievement: { label: 'Achievement', icon: 'trophy-outline', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  official_announcement: { label: 'Official', icon: 'megaphone-outline', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  partnership: { label: 'Partnership', icon: 'people-outline', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' },
  academic: { label: 'Academic', icon: 'school-outline', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
};

interface StandardPostCardProps {
  post: StudentFeedPost;
  canReact: boolean;
  canComment: boolean;
  canManage: boolean;
  onComment: (post: StudentFeedPost) => void;
  onDelete?: (post: StudentFeedPost) => void;
  onEdit?: (post: StudentFeedPost) => void;
  onLike?: (post: StudentFeedPost) => Promise<void> | void;
  onMediaPress?: (post: StudentFeedPost, media: StudentFeedPost['media'][number]) => void;
}

export function StandardPostCard({
  post,
  canReact,
  canComment,
  canManage,
  onComment,
  onDelete,
  onEdit,
  onLike,
  onMediaPress,
}: StandardPostCardProps) {
  const { colors, shadow } = useAppTheme();
  const [liked, setLiked] = useState(!!post.is_reacted);
  const [likeCount, setLikeCount] = useState(post.reactions_count);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    setLiked(!!post.is_reacted);
    setLikeCount(post.reactions_count);
  }, [post.id, post.is_reacted, post.reactions_count]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const catMeta = CATEGORY_META[post.category] || CATEGORY_META.general;
  const sender = post.author_name || post.course_name || post.institution_name || 'Campusly';
  const role = post.author_actor ? post.author_actor.charAt(0).toUpperCase() + post.author_actor.slice(1) : 'Staff';

  const images = post.media.filter((item) => item.type === 'image');
  const attachments = post.media.filter((item) => item.type !== 'image');
  const videoAttachment = attachments.find((item) => item.type === 'video');
  const documentAttachments = attachments.filter((item) => item.type === 'document');

  const videoPlayer = useVideoPlayer(videoAttachment?.url || '', (player) => {
    player.loop = true;
    player.muted = true;
    player.volume = 0;
  });

  useEffect(() => {
    if (!videoAttachment) return;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.play();
    return () => {
      try {
        videoPlayer.pause();
      } catch {
        // Player may be released
      }
    };
  }, [videoAttachment, videoPlayer]);

  const longBody = post.body.length > 200;
  const bodyText = expanded || !longBody ? post.body : `${post.body.slice(0, 200).trim()}...`;

  const onShare = async () => {
    haptics.light();
    await Share.share({ message: `${post.title ? `${post.title}\n\n` : ''}${post.body}`.trim() });
  };

  const onMenu = () => {
    if (!canManage) return;
    haptics.medium();
    Alert.alert('Post options', undefined, [
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
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
        shadowColor: '#1B1730',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }}
    >
      {/* Post Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.brandSoft,
              borderWidth: 1.5,
              borderColor: colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {post.author_avatar ? (
              <Image source={{ uri: post.author_avatar }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <AppText variant="label" weight="extrabold" tone="brand">
                {initialsFromName(sender)}
              </AppText>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="label" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {sender}
              </AppText>
              <View
                style={{
                  backgroundColor: catMeta.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name={catMeta.icon} size={11} color={catMeta.color} />
                <AppText variant="caption" weight="bold" style={{ color: catMeta.color, fontSize: 10 }}>
                  {catMeta.label}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {relativeTime(post.created_at)} · {role}
            </AppText>
          </View>
        </View>

        {canManage ? (
          <TouchableOpacity onPress={onMenu} style={{ padding: 6 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Title & Body */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        {post.title ? (
          <AppText variant="heading" weight="bold" style={{ fontSize: 18, lineHeight: 24, marginBottom: 6 }}>
            {post.title}
          </AppText>
        ) : null}

        <AppText variant="body" tone="secondary" style={{ lineHeight: 22 }}>
          {bodyText}
        </AppText>

        {longBody ? (
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ marginTop: 4 }}>
            <AppText variant="caption" weight="bold" tone="brand">
              {expanded ? 'Show less' : 'Read more'}
            </AppText>
          </TouchableOpacity>
        ) : null}

        {/* Tags */}
        {post.tags && post.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {post.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 12,
                }}
              >
                <AppText variant="caption" weight="semibold" tone="brand">
                  #{tag.replace(/^#/, '')}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Media Attachments */}
      {images.length > 0 ? (
        <View style={{ width: '100%', aspectRatio: images.length === 1 ? 16 / 9 : 2 }}>
          {images.length === 1 ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onMediaPress?.(post, images[0])}
              style={{ width: '100%', height: '100%' }}
            >
              <Image source={{ uri: images[0].url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', width: '100%', height: '100%', gap: 4 }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onMediaPress?.(post, images[0])}
                style={{ flex: 1, height: '100%' }}
              >
                <Image source={{ uri: images[0].url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onMediaPress?.(post, images[1])}
                style={{ flex: 1, height: '100%', position: 'relative' }}
              >
                <Image source={{ uri: images[1].url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                {images.length > 2 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="heading" weight="bold" style={{ color: '#FFFFFF' }}>
                      +{images.length - 2}
                    </AppText>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}

      {/* Video Attachment */}
      {videoAttachment ? (
        <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000' }}>
          <VideoView player={videoPlayer} style={{ width: '100%', height: '100%' }} nativeControls />
        </View>
      ) : null}

      {/* Document Attachments */}
      {documentAttachments.length > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
          {documentAttachments.map((doc, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => doc.url && Linking.openURL(doc.url)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceMuted,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: colors.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" numberOfLines={1}>
                  {doc.label || doc.file_name || 'Document'}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Tap to open
                </AppText>
              </View>
              <Ionicons name="download-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Action Footer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleLike}
          disabled={!canReact}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Animated.View style={heartStyle}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.danger : colors.textMuted} />
          </Animated.View>
          <AppText variant="caption" weight="semibold" style={{ color: liked ? colors.danger : colors.textMuted }}>
            {likeCount > 0 ? likeCount : 'Like'}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onComment(post)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
          <AppText variant="caption" weight="semibold" style={{ color: colors.textMuted }}>
            {post.comments_count > 0 ? `${post.comments_count} Comments` : 'Comment'}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShare}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="share-outline" size={20} color={colors.textMuted} />
          <AppText variant="caption" weight="semibold" style={{ color: colors.textMuted }}>
            Share
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
