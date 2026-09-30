// src/components/explorer/PostCard.tsx
import { View, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import type { PublicPost } from '@/lib/types/explorer';
import { POST_CATEGORY_LABELS, POST_CATEGORY_ICONS, POST_CATEGORY_COLORS } from '@/lib/types/explorer';

interface PostCardProps {
  post: PublicPost;
  onReact: () => void;
}

export function PostCard({ post, onReact }: PostCardProps) {
  const categoryColor = POST_CATEGORY_COLORS[post.category] || '#64748b';
  const categoryIcon = POST_CATEGORY_ICONS[post.category] || 'information-circle-outline';
  const categoryLabel = POST_CATEGORY_LABELS[post.category] || 'General';

  // Format date (e.g., "Oct 24, 2023")
  const formattedDate = new Date(post.published_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark mb-4 overflow-hidden">
      {/* Media (if exists) */}
      {post.media && post.media.length > 0 && post.media[0].type === 'image' && (
        <Image 
          source={{ uri: post.media[0].url }} 
          className="w-full aspect-video" 
          resizeMode="cover" 
        />
      )}
      {/* Note: For video, you would use <Video> from 'expo-av' here */}

      <View className="p-4">
        {/* Header: Category & Date */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-1.5">
            <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: `${categoryColor}20` }}>
              <Ionicons name={categoryIcon} size={14} color={categoryColor} />
            </View>
            <ThemedText variant="tiny" className="font-semibold" style={{ color: categoryColor }}>
              {categoryLabel}
            </ThemedText>
          </View>
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">
            {formattedDate}
          </ThemedText>
        </View>

        {/* Content */}
        {post.title && (
          <ThemedText variant="subheading" className="text-text dark:text-text-dark mb-2" numberOfLines={2}>
            {post.title}
          </ThemedText>
        )}
        <ThemedText variant="body" className="text-text-muted dark:text-text-muted-dark leading-5 mb-3" numberOfLines={4}>
          {post.body}
        </ThemedText>

        {/* Footer: Reactions & Comments */}
        <View className="flex-row items-center justify-between pt-3 border-t border-border dark:border-border-dark">
          <TouchableOpacity 
            onPress={() => { haptics.light(); onReact(); }}
            className="flex-row items-center gap-1.5"
          >
            <Ionicons 
              name={post.is_reacted ? 'heart' : 'heart-outline'} 
              size={20} 
              color={post.is_reacted ? '#ef4444' : '#64748b'} 
            />
            <ThemedText variant="caption" className={post.is_reacted ? 'text-red-500 font-semibold' : 'text-text-muted dark:text-text-muted-dark'}>
              {post.reactions_count}
            </ThemedText>
          </TouchableOpacity>

          <View className="flex-row items-center gap-1.5">
            <Ionicons name="chatbubble-outline" size={18} color="#64748b" />
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">
              {post.comments_count}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}