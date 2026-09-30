// src/components/explorer/ExplorerFeed.tsx
import { View, FlatList, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ThemedText } from '@/ui/ThemedText';
import { PostCard } from './PostCard';
import type { PublicPost } from '@/lib/types/explorer';
import { Ionicons } from '@expo/vector-icons';

interface ExplorerFeedProps {
  posts: PublicPost[];
  loading: boolean;
  onReact: (postId: string) => void;
}

export function ExplorerFeed({ posts, loading, onReact }: ExplorerFeedProps) {
  if (loading) {
    return (
      <Animated.View entering={FadeIn.duration(250)} className="py-16 items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
        <ThemedText variant="muted" className="mt-3">Loading updates...</ThemedText>
      </Animated.View>
    );
  }

  if (posts.length === 0) {
    return (
      <Animated.View entering={FadeInDown.duration(400)} className="py-16 items-center px-8">
        <Animated.View entering={FadeInDown.duration(500).delay(100)} className="w-20 h-20 rounded-3xl bg-accent-start/10 items-center justify-center mb-5">
          <Ionicons name="newspaper-outline" size={34} color="#4f46e5" />
        </Animated.View>
        <ThemedText variant="subheading" className="text-center text-text dark:text-text-dark mb-2">
          No posts yet
        </ThemedText>
        <ThemedText variant="muted" className="text-center">
          This institution has not published any announcements yet. Check back later for updates.
        </ThemedText>
      </Animated.View>
    );
  }

  return (
    <View className="px-5 py-6">
      <ThemedText variant="subheading" className="text-text dark:text-text-dark mb-4">Feed</ThemedText>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onReact={() => onReact(item.id)} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // Space for sticky CTA
      />
    </View>
  );
}