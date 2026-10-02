// src/components/explorer/ExplorerFeed.tsx
import { View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import type { PublicPost } from '@/lib/types/explorer';
import { EmptyState } from '@/ui/EmptyState';
import { Skeleton } from '@/ui/Skeleton';
import { COLUMN } from '@/ui/layout';
import { useAppTheme } from '@/ui/useAppTheme';
import { PostCard } from './PostCard';

interface ExplorerFeedProps {
  posts: PublicPost[];
  loading: boolean;
  onReact: (postId: string) => void;
}

export function ExplorerFeed({ posts, loading, onReact }: ExplorerFeedProps) {
  const { colors } = useAppTheme();

  if (loading) {
    return (
      <Animated.View entering={FadeIn.duration(250)} style={[COLUMN, { paddingHorizontal: 20, paddingTop: 20 }]}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              marginBottom: 14,
              padding: 16,
              gap: 12,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Skeleton width={110} height={26} radius={13} />
            <Skeleton width="85%" height={18} />
            <Skeleton height={14} />
            <Skeleton width="70%" height={14} />
          </View>
        ))}
      </Animated.View>
    );
  }

  if (posts.length === 0) {
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={{ paddingTop: 24, paddingBottom: 120 }}>
        <EmptyState
          icon="newspaper-outline"
          title="No posts yet"
          message="This institution has not published any announcements yet. Check back later for updates."
        />
      </Animated.View>
    );
  }

  return (
    <View style={[COLUMN, { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }]}>
      {posts.map((item) => (
        <PostCard key={item.id} post={item} onReact={() => onReact(item.id)} />
      ))}
    </View>
  );
}
