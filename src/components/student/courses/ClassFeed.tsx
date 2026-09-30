import { FlatList, RefreshControl } from 'react-native';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { FeedPostCard } from '@/components/student/home/FeedPostCard';
import type { StudentFeedPost } from '@/lib/types/student';

interface ClassFeedProps {
  posts: StudentFeedPost[];
  courseName: string;
  refreshing: boolean;
  onRefresh: () => void;
  canReact: boolean;
  canComment: boolean;
  viewerUserId?: string;
  onComment: (post: StudentFeedPost) => void;
  onDelete?: (post: StudentFeedPost) => void;
  onLike?: (post: StudentFeedPost) => Promise<void> | void;
}

export function ClassFeed({
  posts,
  courseName,
  refreshing,
  onRefresh,
  canReact,
  canComment,
  viewerUserId,
  onComment,
  onDelete,
  onLike,
}: ClassFeedProps) {
  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <FeedPostCard
          post={{
            ...item,
            author_name: item.author_actor === 'student' ? item.author_name : courseName || item.author_name,
          }}
          canReact={canReact}
          canComment={canComment}
          canManage={item.author_user_id === viewerUserId}
          onComment={onComment}
          onDelete={onDelete}
          onLike={onLike}
        />
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1877f2" />}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, flexGrow: 1 }}
      ListEmptyComponent={
        <EmptyStateAnimation
          icon="chatbubbles-outline"
          title="No class posts yet"
          subtitle="Teacher broadcasts will appear here"
        />
      }
    />
  );
}
