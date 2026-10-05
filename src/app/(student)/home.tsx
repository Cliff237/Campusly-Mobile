import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { StoriesRow } from '@/components/student/home/StoriesRow';
import { FeedFilters } from '@/components/student/home/FeedFilters';
import { FeedPostCard } from '@/components/student/home/FeedPostCard';
import { StatusComposerBar } from '@/components/student/home/StatusComposerBar';
import { PostComposer } from '@/components/student/home/PostComposer';
import { CommentsSheet } from '@/components/student/shared/CommentsSheet';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { ThemedText } from '@/ui/ThemedText';
import { AppText } from '@/ui/AppText';
import { FeedSkeleton } from '@/components/student/shared/FeedSkeleton';
import { showToast } from '@/ui/Toast';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import {
  deleteInstitutionPost,
  fetchStudentHomeFeed,
  fetchStudentDashboard,
  togglePostReaction,
  type StudentDashboard,
} from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { PostMedia, StudentFeedFilter, StudentFeedPost, StoryItem } from '@/lib/types/student';

const MEDIA_PAGE_HEIGHT = Dimensions.get('window').height;

function MediaDetailItem({
  item,
  active,
}: {
  item: { media: PostMedia; post: StudentFeedPost };
  active: boolean;
}) {
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
        // Ignored
      }
    }
    return () => {
      try {
        player.pause();
      } catch {
        // Ignored
      }
    };
  }, [active, item.media.type, player]);

  return (
    <View style={{ height: MEDIA_PAGE_HEIGHT, justifyContent: 'center' }}>
      {item.media.type === 'image' ? (
        <Image
          source={{ uri: item.media.url }}
          style={{ width: '100%', aspectRatio: 1 }}
          contentFit="contain"
        />
      ) : (
        <VideoView player={player} style={{ width: '100%', aspectRatio: 16 / 9 }} nativeControls />
      )}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 }}>
        <ThemedText variant="subheading" style={{ color: '#ffffff', fontWeight: '800' }}>
          {item.post.title || 'Campus post'}
        </ThemedText>
        <ThemedText variant="body" style={{ color: '#cbd5e1', marginTop: 7, lineHeight: 22 }}>
          {item.post.body}
        </ThemedText>
        <ThemedText variant="tiny" style={{ color: '#94a3b8', marginTop: 12 }}>
          {item.post.author_name} · {item.post.category}
        </ThemedText>
      </View>
    </View>
  );
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const { accessToken, currentMembership, user } = useAuth();
  const { hasPermission } = usePermissions();
  const { colors, isDark } = useAppTheme();
  const bottomOffset = useBottomTabOffset(36); // Prevents floating bar & system nav from hiding content

  const [filter, setFilter] = useState<StudentFeedFilter>('institution');
  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<StudentFeedPost | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const mediaItems = useMemo(
    () =>
      posts.flatMap((post) =>
        post.media
          .filter((media) => media.type === 'image' || media.type === 'video')
          .map((media) => ({ media, post }))
      ),
    [posts]
  );
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const mediaListRef = useRef<FlatList<{ media: PostMedia; post: StudentFeedPost }>>(null);

  useEffect(() => {
    if (selectedMediaIndex != null) {
      requestAnimationFrame(() =>
        mediaListRef.current?.scrollToIndex({ index: selectedMediaIndex, animated: false })
      );
    }
  }, [selectedMediaIndex]);

  const bg = isDark ? '#0A0818' : '#F8FAFC';

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
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [feedData, dashData] = await Promise.all([
          currentMembership.permissions.includes('view_feed')
            ? fetchStudentHomeFeed({
                institutionId: currentMembership.institution_id,
                institutionName: currentMembership.institution_name,
                accessToken,
                filter,
              })
            : Promise.resolve([]),
          fetchStudentDashboard(currentMembership.institution_id, accessToken).catch(() => null),
        ]);
        setPosts(feedData);
        if (dashData) setDashboard(dashData);
      } catch (error) {
        showToast.error('Feed', error instanceof Error ? error.message : 'Could not load posts');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, currentMembership, filter]
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
    [accessToken]
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
            : item
        )
      );
    },
    [accessToken]
  );

  const onCreated = useCallback(() => {
    void load(true);
  }, [load]);

  const onCommentCountBump = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId ? { ...item, comments_count: item.comments_count + 1 } : item
      ),
    );
  }, []);

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const enrolledCount = dashboard?.courses?.length ?? 0;
  const attendancePct = dashboard?.stats?.attendance_percent ?? 96;

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
              onEdit={(post) => {
                setEditingPost(post);
                setComposerOpen(true);
              }}
              onLike={onLike}
              onMediaPress={(post, media) => {
                const idx = mediaItems.findIndex(
                  (mi) => mi.post.id === post.id && mi.media.url === media.url
                );
                if (idx >= 0) setSelectedMediaIndex(idx);
              }}
            />
          </Animated.View>
        )}
        ListHeaderComponent={
          <View>
            {/* Top Welcome Hero Banner */}
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
              <View
                style={{
                  borderRadius: 26,
                  overflow: 'hidden',
                  backgroundColor: '#1C1335',
                  position: 'relative',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  elevation: 6,
                  shadowColor: '#3A1E82',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                }}
              >
                <LinearGradient
                  colors={['#170F2E', '#311A6E', '#5B3FD1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                {/* Ambient decorative glowing circles */}
                <View
                  style={{
                    position: 'absolute',
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    top: -40,
                    right: -30,
                    pointerEvents: 'none',
                  }}
                />

                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="sparkles" size={13} color="#FBBF24" />
                        <AppText variant="overline" weight="extrabold" style={{ color: '#E0D7FE', letterSpacing: 1 }}>
                          STUDENT PORTAL
                        </AppText>
                      </View>
                      <AppText variant="title" weight="extrabold" style={{ color: '#FFFFFF', marginTop: 3 }}>
                        {greeting}, {user?.full_name?.split(' ')[0] || 'Student'}!
                      </AppText>
                      <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 }}>
                        {currentMembership?.institution_name || 'Campusly University'}
                      </AppText>
                    </View>

                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <Ionicons name="school" size={22} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Academic Metrics Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      marginTop: 16,
                      paddingTop: 14,
                      borderTopWidth: 1,
                      borderTopColor: 'rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => router.push(href('/(student)/courses'))}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 16,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <AppText variant="overline" weight="bold" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        COURSES
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Ionicons name="book-outline" size={14} color="#A78BFA" />
                        <AppText variant="label" weight="extrabold" style={{ color: '#FFFFFF' }}>
                          {enrolledCount} Enrolled
                        </AppText>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push(href('/(student)/schedule'))}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 16,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <AppText variant="overline" weight="bold" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        ATTENDANCE
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Ionicons name="shield-checkmark-outline" size={14} color="#34D399" />
                        <AppText variant="label" weight="extrabold" style={{ color: '#34D399' }}>
                          {attendancePct}% Present
                        </AppText>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push(href('/(student)/marks'))}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 16,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <AppText variant="overline" weight="bold" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        RESULTS
                      </AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Ionicons name="stats-chart" size={14} color="#FBBF24" />
                        <AppText variant="label" weight="extrabold" style={{ color: '#FFFFFF' }}>
                          My Marks
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Post composer bar */}
            <PermissionGate permission="post_to_feed">
              <StatusComposerBar onPress={() => setComposerOpen(true)} />
            </PermissionGate>

            {/* Stories Row */}
            <View
              style={{
                backgroundColor: isDark ? '#140E28' : '#FFFFFF',
                paddingTop: 8,
                marginBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <StoriesRow items={stories} onPress={() => setFilter('institution')} />
            </View>

            {/* Category / Scope Filter Tabs */}
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
              subtitle="You need view_feed permission to see campus announcements"
            />
          ) : (
            <EmptyStateAnimation
              icon="newspaper-outline"
              title="Your feed is empty"
              subtitle="Be the first to share an update with your campus community"
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: bottomOffset, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      />

      <PostComposer
        visible={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setEditingPost(null);
        }}
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

      {/* Media Detail Modal */}
      <Modal
        visible={selectedMediaIndex != null}
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setSelectedMediaIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#080b12' }}>
          <TouchableOpacity
            onPress={() => setSelectedMediaIndex(null)}
            style={{
              position: 'absolute',
              top: 56,
              left: 18,
              zIndex: 2,
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Close media viewer"
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <FlatList
            ref={mediaListRef}
            data={mediaItems}
            keyExtractor={(item, index) =>
              `${item.post.id}-${item.media.id || item.media.url}-${index}`
            }
            initialScrollIndex={selectedMediaIndex ?? 0}
            getItemLayout={(_data, index) => ({
              length: MEDIA_PAGE_HEIGHT,
              offset: MEDIA_PAGE_HEIGHT * index,
              index,
            })}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const height = event.nativeEvent.layoutMeasurement.height;
              if (height > 0)
                setSelectedMediaIndex(Math.round(event.nativeEvent.contentOffset.y / height));
            }}
            renderItem={({ item, index }) => (
              <MediaDetailItem item={item} active={index === selectedMediaIndex} />
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
