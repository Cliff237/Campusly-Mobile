import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Linking, Modal, RefreshControl, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { StoriesRow } from '@/components/student/home/StoriesRow';
import { FeedFilters } from '@/components/student/home/FeedFilters';
import { FeedPostCard } from '@/components/student/home/FeedPostCard';
import { StatusComposerBar } from '@/components/student/home/StatusComposerBar';
import { PostComposer } from '@/components/student/home/PostComposer';
import { CommentsSheet } from '@/components/student/shared/CommentsSheet';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { ThemedText } from '@/ui/ThemedText';
import { FeedSkeleton } from '@/components/student/shared/FeedSkeleton';
import { showToast } from '@/ui/Toast';
import {
  deleteInstitutionPost,
  fetchStudentHomeFeed,
  togglePostReaction,
} from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { PostMedia, StudentFeedFilter, StudentFeedPost, StoryItem } from '@/lib/types/student';

const MEDIA_PAGE_HEIGHT = Dimensions.get('window').height;

function MediaDetailItem({ item, active }: { item: { media: PostMedia; post: StudentFeedPost }; active: boolean }) {
  const player = useVideoPlayer(item.media.type === 'video' ? item.media.url : '', (video) => {
    video.loop = false;
  });

  useEffect(() => {
    if (item.media.type !== 'video') return;
    player.muted = !active;
    player.volume = active ? 1 : 0;
    if (active) player.play();
    else {
      try {
        player.pause();
      } catch {
        // The native player may already be released during a pager update.
      }
    }
    return () => {
      try {
        player.pause();
      } catch {
        // The native player may already be released during unmount.
      }
    };
  }, [active, item.media.type, player]);

  return (
    <View style={{ height: MEDIA_PAGE_HEIGHT, justifyContent: 'center' }}>
      {item.media.type === 'image' ? <Image source={{ uri: item.media.url }} style={{ width: '100%', aspectRatio: 1 }} contentFit="contain" /> : <VideoView player={player} style={{ width: '100%', aspectRatio: 16 / 9 }} nativeControls />}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 }}>
        <ThemedText variant="subheading" style={{ color: '#ffffff', fontWeight: '800' }}>{item.post.title || 'Campus post'}</ThemedText>
        <ThemedText variant="body" style={{ color: '#cbd5e1', marginTop: 7, lineHeight: 22 }}>{item.post.body}</ThemedText>
        <ThemedText variant="tiny" style={{ color: '#94a3b8', marginTop: 12 }}>{item.post.author_name} · {item.post.category}</ThemedText>
      </View>
    </View>
  );
}

export default function StudentHomeScreen() {
  const { accessToken, currentMembership, user } = useAuth();
  const { hasPermission } = usePermissions();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [filter, setFilter] = useState<StudentFeedFilter>('institution');
  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<StudentFeedPost | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const mediaItems = useMemo(() => posts.flatMap((post) => post.media.filter((media) => media.type === 'image' || media.type === 'video').map((media) => ({ media, post }))), [posts]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const selectedMedia = selectedMediaIndex == null ? null : mediaItems[selectedMediaIndex];
  const mediaListRef = useRef<FlatList<{ media: PostMedia; post: StudentFeedPost }>>(null);

  useEffect(() => {
    if (selectedMediaIndex != null) {
      requestAnimationFrame(() => mediaListRef.current?.scrollToIndex({ index: selectedMediaIndex, animated: false }));
    }
  }, [selectedMediaIndex]);
  const bg = isDark ? '#18191a' : '#f0f2f5';

  const stories = useMemo<StoryItem[]>(() => {
    if (!currentMembership) return [];
    return [
      {
        id: currentMembership.institution_id,
        label: currentMembership.institution_name,
        image_url: currentMembership.institution_logo_url,
        kind: 'institution',
      },
    ];
  }, [currentMembership]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !currentMembership) return;
      if (!currentMembership.permissions.includes('view_feed')) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await fetchStudentHomeFeed({
          institutionId: currentMembership.institution_id,
          institutionName: currentMembership.institution_name,
          accessToken,
          filter,
        });
        setPosts(data);
      } catch (error) {
        showToast.error('Feed', error instanceof Error ? error.message : 'Could not load posts');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, currentMembership, filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = useCallback(
    async (post: StudentFeedPost) => {
      if (!accessToken) return;
      try {
        await deleteInstitutionPost(post.id, accessToken);
        setPosts((prev) => prev.filter((item) => item.id !== post.id));
        showToast.success('Deleted', 'Post removed');
      } catch (error) {
        showToast.error('Delete failed', error instanceof Error ? error.message : 'Try again');
      }
    },
    [accessToken],
  );

  const onLike = useCallback(
    async (post: StudentFeedPost) => {
      if (!accessToken) return;
      const result = await togglePostReaction(post.id, accessToken);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? {
                ...item,
                is_reacted: result.is_reacted,
                reactions_count: result.reactions_count,
              }
            : item,
        ),
      );
    },
    [accessToken],
  );

  const onCreated = useCallback(() => {
    void load(true);
  }, [load]);

  const onCommentCountBump = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId ? { ...item, comments_count: item.comments_count + 1 } : item,
      ),
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 210))}>
            <FeedPostCard
              post={item}
              canReact={hasPermission('react_to_posts')}
              canComment={hasPermission('comment_on_posts')}
              canManage={item.author_user_id === user?.id}
              onComment={(post) => setCommentPostId(post.id)}
              onDelete={onDelete}
              onEdit={(post) => { setEditingPost(post); setComposerOpen(true); }}
              onLike={onLike}
              onMediaPress={(post, media) => {
                const index = mediaItems.findIndex((item) => item.post.id === post.id && item.media.url === media.url);
                if (index >= 0) setSelectedMediaIndex(index);
              }}
            />
          </Animated.View>
        )}
        ListHeaderComponent={
          <View>
            <PermissionGate permission="post_to_feed">
              <StatusComposerBar onPress={() => setComposerOpen(true)} />
            </PermissionGate>
            <View style={{ backgroundColor: isDark ? '#242526' : '#ffffff', paddingTop: 8, marginBottom: 8 }}>
              <StoriesRow items={stories} onPress={() => setFilter('institution')} />
            </View>
            <FeedFilters value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <FeedSkeleton />
          ) : !hasPermission('view_feed') ? (
            <EmptyStateAnimation
              icon="lock-closed-outline"
              title="Feed hidden"
              subtitle="You need view_feed to see campus posts"
            />
          ) : (
            <EmptyStateAnimation
              icon="newspaper-outline"
              title="Your feed is empty"
              subtitle="Be the first to share something with campus"
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#1877f2" />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => undefined}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      />

      <PostComposer
        visible={composerOpen}
        onClose={() => { setComposerOpen(false); setEditingPost(null); }}
        onCreated={onCreated}
        editingPost={editingPost}
      />
      <CommentsSheet
        visible={commentPostId != null}
        postId={commentPostId}
        canComment={hasPermission('comment_on_posts')}
        onClose={() => setCommentPostId(null)}
        onCommented={() => {
          if (commentPostId) onCommentCountBump(commentPostId);
        }}
      />

      <Modal
        visible={selectedMediaIndex != null}
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setSelectedMediaIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#080b12' }}>
          <TouchableOpacity
            onPress={() => setSelectedMediaIndex(null)}
            style={{ position: 'absolute', top: 56, left: 18, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Close media viewer"
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <FlatList
            ref={mediaListRef}
            data={mediaItems}
            keyExtractor={(item, index) => `${item.post.id}-${item.media.id || item.media.url}-${index}`}
            initialScrollIndex={selectedMediaIndex ?? 0}
            getItemLayout={(_data, index) => ({ length: MEDIA_PAGE_HEIGHT, offset: MEDIA_PAGE_HEIGHT * index, index })}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const height = event.nativeEvent.layoutMeasurement.height;
              if (height > 0) setSelectedMediaIndex(Math.round(event.nativeEvent.contentOffset.y / height));
            }}
            renderItem={({ item, index }) => <MediaDetailItem item={item} active={index === selectedMediaIndex} />}
          />
        </View>
      </Modal>
    </View>
  );
}
