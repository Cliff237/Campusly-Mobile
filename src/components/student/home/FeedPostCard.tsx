import { memo, useEffect, useState } from 'react';
import { Alert, Linking, Share, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { initialsFromName, relativeTime } from '@/lib/format';
import { monthDayBadge, postTypeTheme } from '@/components/feed/postTypeTheme';
import { DetailRow, TintChip } from '@/components/feed/PostCardBits';
import type { StudentFeedPost } from '@/lib/types/student';

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

/**
 * Feed post card with a per-type identity: every category gets its own ribbon
 * colour, icon and detail panel, so events, opportunities, announcements and
 * achievements are instantly recognisable while scrolling.
 *
 * Interactions (like / comment / share / menu / media) are unchanged.
 */
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
  const { colors, shadow } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const [liked, setLiked] = useState(!!post.is_reacted);
  const [likeCount, setLikeCount] = useState(post.reactions_count);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const scale = useSharedValue(1);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    setLiked(!!post.is_reacted);
    setLikeCount(post.reactions_count);
  }, [post.id, post.is_reacted, post.reactions_count]);

  // Events and official announcements breathe gently — rare categories, so
  // only a couple of cards in view ever run this loop.
  useEffect(() => {
    if (post.category !== 'event' && post.category !== 'official_announcement') return;
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [badgePulse, post.category]);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgePulse.value }] }));

  const theme = postTypeTheme(post.category, isDark);
  const muted = colors.textMuted;
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

  const longBody = post.body.length > 180;
  const bodyText = expanded || !longBody ? post.body : `${post.body.slice(0, 180).trim()}...`;

  const meta = post.metadata ?? {};
  const eventBadge = post.category === 'event' ? monthDayBadge(meta.start_date) : null;
  const hasDetail =
    post.category === 'event' ||
    post.category === 'opportunity' ||
    post.category === 'achievement' ||
    post.category === 'official_announcement';

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
        backgroundColor: colors.surface,
        marginBottom: 14,
        marginHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? colors.border : theme.soft,
        overflow: 'hidden',
        boxShadow: shadow.sm,
      }}
    >
      {/* ── Type ribbon ── */}
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <Animated.View
          entering={FadeInRight.duration(280)}
          style={[
            { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
            badgeStyle,
          ]}
        >
          <Ionicons name={theme.icon} size={16} color="#FFFFFF" />
        </Animated.View>
        <AppText
          weight="bold"
          color="#FFFFFF"
          style={{ flex: 1, fontSize: 11.5, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' }}
          numberOfLines={1}
        >
          {theme.ribbon}
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
        ) : post.pinned ? (
          <Ionicons name="pin" size={15} color="#FFFFFF" />
        ) : null}
      </LinearGradient>

      {/* ── Author ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.gradient[1],
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {post.author_avatar ? (
            <Image source={{ uri: post.author_avatar }} style={{ width: 40, height: 40 }} contentFit="cover" />
          ) : (
            <AppText weight="bold" color="#FFFFFF" style={{ fontSize: 13 }}>
              {initialsFromName(sender)}
            </AppText>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="label" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {sender}
            </AppText>
            {post.pinned ? <Ionicons name="pin" size={12} color={colors.warning} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexShrink: 1 }}>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {relativeTime(post.published_at ?? post.created_at)}
            </AppText>
            {post.scope === 'course_specific' ? (
              <TintChip
                label={post.course_code || 'Course'}
                color={theme.onSoft}
                bg={theme.soft}
              />
            ) : null}
          </View>
        </View>
        {canManage ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Post menu" onPress={onMenu} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={18} color={muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Body ── */}
      <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
        {post.title ? (
          <AppText variant="subheading" style={{ marginBottom: 4 }} numberOfLines={2}>
            {post.title}
          </AppText>
        ) : null}
        <AppText tone="secondary" style={{ lineHeight: 22 }}>
          {bodyText}
        </AppText>
        {longBody ? (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={6}>
            <AppText variant="caption" weight="bold" color={theme.onSoft} style={{ marginTop: 5 }}>
              {expanded ? 'See less' : 'See more'}
            </AppText>
          </TouchableOpacity>
        ) : null}
        {post.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
            {post.tags.slice(0, 4).map((tag) => (
              <TintChip key={tag} label={`#${tag}`} color={theme.onSoft} bg={theme.soft} />
            ))}
          </View>
        ) : null}

        {/* ── Type-specific detail panel ── */}
        {hasDetail ? (
          <Animated.View
            entering={FadeInRight.duration(300).delay(60)}
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 16,
              backgroundColor: theme.soft,
              borderLeftWidth: 3,
              borderLeftColor: theme.accent,
              gap: 8,
            }}
          >
            {post.category === 'event' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="calendar" size={15} color={theme.onSoft} />
                  <AppText weight="bold" color={theme.onSoft} style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Event details
                  </AppText>
                </View>
                <DetailRow
                  icon="time-outline"
                  color={theme.onSoft}
                  bg={isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'}
                  text={`${String(meta.start_date || 'Date to be announced')}${meta.start_time ? ` at ${String(meta.start_time)}` : ''}`}
                />
                {meta.location ? (
                  <DetailRow icon="location-outline" color={theme.onSoft} bg={isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'} text={String(meta.location)} />
                ) : null}
              </>
            ) : post.category === 'opportunity' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="rocket-outline" size={15} color={theme.onSoft} />
                  <AppText weight="bold" color={theme.onSoft} style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Opportunity
                  </AppText>
                </View>
                <DetailRow
                  icon="hourglass-outline"
                  color={theme.onSoft}
                  bg={isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'}
                  text={`Apply by ${String(meta.application_deadline || 'deadline not set')}`}
                />
                {meta.external_link ? (
                  <TouchableOpacity onPress={() => void Linking.openURL(String(meta.external_link))} accessibilityRole="link">
                    <DetailRow icon="open-outline" color={theme.onSoft} bg={isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'} text="View application link" />
                  </TouchableOpacity>
                ) : null}
              </>
            ) : post.category === 'achievement' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Animated.View style={[{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, badgeStyle]}>
                  <Ionicons name="trophy" size={17} color={theme.accent} />
                </Animated.View>
                <View style={{ flexShrink: 1 }}>
                  <AppText weight="bold" color={theme.onSoft} style={{ fontSize: 12, lineHeight: 15 }}>
                    Celebrating a campus win
                  </AppText>
                  {meta.achievement_date ? (
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {String(meta.achievement_date)}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="megaphone" size={17} color={theme.accent} />
                </View>
                <AppText weight="bold" color={theme.onSoft} style={{ fontSize: 12, lineHeight: 15, flexShrink: 1 }}>
                  Official campus announcement
                </AppText>
              </View>
            )}
          </Animated.View>
        ) : null}
        {post.category === 'academic' && post.course_code ? (
          <View style={{ marginTop: 10 }}>
            <TintChip label={`📘 ${post.course_code}`} color={theme.onSoft} bg={theme.soft} />
          </View>
        ) : null}
      </View>

      {/* ── Media ── */}
      {images.length === 1 ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onMediaPress?.(post, images[0])}>
          <Image source={{ uri: images[0].url }} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="cover" />
        </TouchableOpacity>
      ) : null}
      {images.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {images.slice(0, 4).map((item, index) => (
            <TouchableOpacity
              key={item.id || `${item.url}-${index}`}
              onPress={() => onMediaPress?.(post, item)}
              style={{ width: images.length === 3 && index === 0 ? '100%' : '50%' }}
            >
              <Image source={{ uri: item.url }} style={{ width: '100%', aspectRatio: images.length === 3 && index === 0 ? 16 / 9 : 1 }} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {videoAttachment ? (
        <View style={{ backgroundColor: '#080b12' }}>
          <VideoView player={videoPlayer} style={{ width: '100%', aspectRatio: 16 / 9 }} nativeControls />
          <TouchableOpacity onPress={() => onMediaPress?.(post, videoAttachment)} style={{ paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="expand-outline" size={15} color="#FFFFFF" />
            <AppText weight="bold" color="#DBEAFE" style={{ fontSize: 11.5, lineHeight: 14 }}>
              Open full view
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
      {documentAttachments.map((attachment) => (
        <TouchableOpacity
          key={attachment.id || attachment.url}
          onPress={() => void Linking.openURL(attachment.url)}
          style={{ margin: 14, marginBottom: 0, padding: 14, borderRadius: 16, backgroundColor: theme.soft, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Ionicons name="document-text-outline" size={28} color={theme.accent} />
          <View style={{ flex: 1 }}>
            <AppText weight="bold" numberOfLines={1}>
              {attachment.label || 'Open document'}
            </AppText>
            <AppText variant="caption" tone="muted">
              Tap to open document
            </AppText>
          </View>
        </TouchableOpacity>
      ))}

      {/* ── Counts ── */}
      {likeCount > 0 || post.comments_count > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: liked || likeCount > 0 ? colors.danger : colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="heart" size={10} color="#FFFFFF" />
            </View>
            <AppText variant="caption" tone="muted">
              {likeCount}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted">
            {post.comments_count} comments
          </AppText>
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14 }} />

      {/* ── Actions ── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 4 }}>
        {canReact && post.allow_reactions ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
            onPress={() => void handleLike()}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
          >
            <Animated.View style={heartStyle}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.danger : muted} />
            </Animated.View>
            <AppText weight="bold" color={liked ? colors.danger : muted} style={{ fontSize: 13 }}>
              Like
            </AppText>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
            <Ionicons name="heart-outline" size={20} color={muted} />
            <AppText weight="bold" tone="muted" style={{ fontSize: 13 }}>
              Like
            </AppText>
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
            <AppText weight="bold" tone="muted" style={{ fontSize: 13 }}>
              Comment
            </AppText>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
            <Ionicons name="chatbubble-outline" size={19} color={muted} />
            <AppText weight="bold" tone="muted" style={{ fontSize: 13 }}>
              Comment
            </AppText>
          </View>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share post"
          onPress={() => void onShare()}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
        >
          <Ionicons name="share-outline" size={19} color={muted} />
          <AppText weight="bold" tone="muted" style={{ fontSize: 13 }}>
            Share
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
});
