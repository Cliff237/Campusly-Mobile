import { memo, useEffect, useState } from 'react';
import { Alert, Linking, Share, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import { initialsFromName, relativeTime } from '@/lib/format';
import type { StudentFeedPost, StudentPostCategory } from '@/lib/types/student';

const CATEGORY_LABELS: Record<StudentPostCategory, string> = {
  general: 'General',
  event: 'Event',
  opportunity: 'Opportunity',
  achievement: 'Achievement',
  official_announcement: 'Official',
  partnership: 'Partnership',
  academic: 'Academic',
};
const CATEGORY_ACCENTS: Record<StudentPostCategory, string> = {
  general: '#6d28d9', event: '#d97706', opportunity: '#3974b8', achievement: '#c98b2e', official_announcement: '#c2415f', partnership: '#0f766e', academic: '#3974b8',
};

interface FeedPostCardProps {
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

export const FeedPostCard = memo(function FeedPostCard({
  post,
  canReact,
  canComment,
  canManage,
  onComment,
  onDelete,
  onEdit,
  onLike,
  onMediaPress,
}: FeedPostCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
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

  const muted = isDark ? '#b0b3b8' : '#65676b';
  const text = isDark ? '#e4e6eb' : '#050505';
  const surface = isDark ? '#242526' : '#ffffff';
  const divider = isDark ? '#3a3b3c' : '#ced0d4';
  const sender = post.author_name || post.course_name || post.institution_name || 'Campusly';
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
        // The native player may already be released during unmount.
      }
    };
  }, [videoAttachment, videoPlayer]);
  const accent = CATEGORY_ACCENTS[post.category] ?? '#1877f2';
  const longBody = post.body.length > 180;
  const bodyText = expanded || !longBody ? post.body : `${post.body.slice(0, 180).trim()}...`;

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
    <View style={{ backgroundColor: surface, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: accent }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#1877f2',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {post.author_avatar ? (
            <Image source={{ uri: post.author_avatar }} style={{ width: 40, height: 40 }} contentFit="cover" />
          ) : (
            <ThemedText variant="caption" style={{ color: '#ffffff', fontWeight: '700' }}>
              {initialsFromName(sender)}
            </ThemedText>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText variant="body" style={{ color: text, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
              {sender}
            </ThemedText>
            {post.pinned ? <Ionicons name="pin" size={12} color="#f7b928" /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <ThemedText variant="tiny" style={{ color: muted }}>
              {relativeTime(post.published_at ?? post.created_at)}
            </ThemedText>
            <ThemedText variant="tiny" style={{ color: muted }}>
              ·
            </ThemedText>
            <ThemedText variant="tiny" style={{ color: muted }}>
              {CATEGORY_LABELS[post.category] ?? post.category}
            </ThemedText>
            {post.scope === 'course_specific' ? (
              <ThemedText variant="tiny" style={{ color: muted }}>
                · {post.course_code || 'Course'}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {canManage ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Post menu" onPress={onMenu} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={18} color={muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
        {post.title ? (
          <ThemedText variant="subheading" style={{ color: text, marginBottom: 4, fontWeight: '700' }}>
            {post.title}
          </ThemedText>
        ) : null}
        <ThemedText variant="body" style={{ color: text, lineHeight: 22 }}>
          {bodyText}
        </ThemedText>
        {longBody ? (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={6}>
            <ThemedText variant="caption" style={{ color: muted, marginTop: 4, fontWeight: '600' }}>
              {expanded ? 'See less' : 'See more'}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
        {post.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {post.tags.slice(0, 4).map((tag) => (
              <ThemedText key={tag} variant="tiny" style={{ color: '#1877f2', fontWeight: '600' }}>
                #{tag}
              </ThemedText>
            ))}
          </View>
        ) : null}
        {post.category === 'event' ? (
          <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: isDark ? '#2e1065' : '#f5f3ff', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="calendar" size={22} color="#7c3aed" />
            <View><ThemedText variant="tiny" style={{ color: '#7c3aed', fontWeight: '800' }}>EVENT DETAILS</ThemedText><ThemedText variant="caption" style={{ color: text, marginTop: 2 }}>{String(post.metadata.start_date || 'Date to be announced')}{post.metadata.start_time ? ` at ${String(post.metadata.start_time)}` : ''}{post.metadata.location ? ` · ${String(post.metadata.location)}` : ''}</ThemedText></View>
          </View>
        ) : null}
        {post.category === 'opportunity' ? (
          <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: isDark ? '#083344' : '#ecfeff', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="rocket" size={22} color="#0891b2" />
            <View><ThemedText variant="tiny" style={{ color: '#0891b2', fontWeight: '800' }}>OPPORTUNITY</ThemedText><ThemedText variant="caption" style={{ color: text, marginTop: 2 }}>Apply by {String(post.metadata.application_deadline || 'deadline not set')}</ThemedText></View>
          </View>
        ) : null}
        {post.category === 'achievement' ? (
          <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: isDark ? '#451a03' : '#fffbeb', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="trophy" size={22} color="#d97706" /><ThemedText variant="caption" style={{ color: isDark ? '#fde68a' : '#92400e', fontWeight: '800' }}>CELEBRATING A CAMPUS WIN · {String(post.metadata.achievement_date || '')}</ThemedText>
          </View>
        ) : null}
        {post.category === 'official_announcement' ? (
          <View style={{ marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: isDark ? '#450a0a' : '#fef2f2', flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="megaphone" size={18} color="#dc2626" /><ThemedText variant="tiny" style={{ color: '#dc2626', fontWeight: '800' }}>OFFICIAL CAMPUS ANNOUNCEMENT</ThemedText></View>
        ) : null}
      </View>

      {images.length === 1 ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onMediaPress?.(post, images[0])}>
          <Image source={{ uri: images[0].url }} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="cover" />
        </TouchableOpacity>
      ) : null}
      {images.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {images.slice(0, 4).map((item, index) => (
            <TouchableOpacity key={item.id || `${item.url}-${index}`} onPress={() => onMediaPress?.(post, item)} style={{ width: images.length === 3 && index === 0 ? '100%' : '50%' }}>
              <Image source={{ uri: item.url }} style={{ width: '100%', aspectRatio: images.length === 3 && index === 0 ? 16 / 9 : 1 }} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {videoAttachment ? (
        <View style={{ backgroundColor: '#080b12' }}>
          <VideoView player={videoPlayer} style={{ width: '100%', aspectRatio: 16 / 9 }} nativeControls />
          <TouchableOpacity onPress={() => onMediaPress?.(post, videoAttachment)} style={{ paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="expand-outline" size={15} color="#ffffff" />
            <ThemedText variant="tiny" style={{ color: '#dbeafe', fontWeight: '700' }}>Open full view</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}
      {documentAttachments.map((attachment) => (
        <TouchableOpacity key={attachment.id || attachment.url} onPress={() => void Linking.openURL(attachment.url)} style={{ margin: 12, padding: 14, borderRadius: 14, backgroundColor: isDark ? '#172554' : '#eff6ff', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="document-text-outline" size={30} color="#2563eb" />
          <View style={{ flex: 1 }}><ThemedText variant="body" style={{ color: text, fontWeight: '700' }}>{attachment.label || 'Open document'}</ThemedText><ThemedText variant="tiny" style={{ color: muted }}>Tap to open document</ThemedText></View>
        </TouchableOpacity>
      ))}

      {(likeCount > 0 || post.comments_count > 0) && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: liked || likeCount > 0 ? '#e41e3f' : divider,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="heart" size={10} color="#ffffff" />
            </View>
            <ThemedText variant="caption" style={{ color: muted }}>
              {likeCount}
            </ThemedText>
          </View>
          <ThemedText variant="caption" style={{ color: muted }}>
            {post.comments_count} comments
          </ThemedText>
        </View>
      )}

      <View style={{ height: 1, backgroundColor: divider, marginHorizontal: 12 }} />

      <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 4 }}>
        {canReact && post.allow_reactions ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
            onPress={() => void handleLike()}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
          >
            <Animated.View style={heartStyle}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#e41e3f' : muted} />
            </Animated.View>
            <ThemedText variant="caption" style={{ color: liked ? '#e41e3f' : muted, fontWeight: '700' }}>
              Like
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
            <Ionicons name="heart-outline" size={20} color={muted} />
            <ThemedText variant="caption" style={{ color: muted, fontWeight: '700' }}>
              Like
            </ThemedText>
          </View>
        )}

        {canComment && post.allow_comments ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Comment on post"
            onPress={() => {
              haptics.light();
              onComment(post);
            }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
          >
            <Ionicons name="chatbubble-outline" size={19} color={muted} />
            <ThemedText variant="caption" style={{ color: muted, fontWeight: '700' }}>
              Comment
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
            <Ionicons name="chatbubble-outline" size={19} color={muted} />
            <ThemedText variant="caption" style={{ color: muted, fontWeight: '700' }}>
              Comment
            </ThemedText>
          </View>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share post"
          onPress={() => void onShare()}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
        >
          <Ionicons name="share-outline" size={19} color={muted} />
          <ThemedText variant="caption" style={{ color: muted, fontWeight: '700' }}>
            Share
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
});
