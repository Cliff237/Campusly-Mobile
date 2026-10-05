import { memo } from 'react';
import { OpportunityPostCard } from './cards/OpportunityPostCard';
import { AchievementPostCard } from './cards/AchievementPostCard';
import { EventPostCard } from './cards/EventPostCard';
import { StandardPostCard } from './cards/StandardPostCard';
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
  if (post.category === 'opportunity') {
    return (
      <OpportunityPostCard
        post={post}
        canReact={canReact}
        canComment={canComment}
        canManage={canManage}
        onComment={onComment}
        onDelete={onDelete}
        onEdit={onEdit}
        onLike={onLike}
      />
    );
  }

  if (post.category === 'achievement') {
    return (
      <AchievementPostCard
        post={post}
        canReact={canReact}
        canComment={canComment}
        canManage={canManage}
        onComment={onComment}
        onDelete={onDelete}
        onEdit={onEdit}
        onLike={onLike}
      />
    );
  }

  if (post.category === 'event') {
    return (
      <EventPostCard
        post={post}
        canReact={canReact}
        canComment={canComment}
        canManage={canManage}
        onComment={onComment}
        onDelete={onDelete}
        onEdit={onEdit}
        onLike={onLike}
      />
    );
  }

  return (
    <StandardPostCard
      post={post}
      canReact={canReact}
      canComment={canComment}
      canManage={canManage}
      onComment={onComment}
      onDelete={onDelete}
      onEdit={onEdit}
      onLike={onLike}
      onMediaPress={onMediaPress}
    />
  );
});
