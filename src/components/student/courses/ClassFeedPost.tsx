import { Alert, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import { relativeTime } from '@/lib/format';
import type { StudentFeedPost } from '@/lib/types/student';

interface ClassFeedPostProps {
  post: StudentFeedPost;
  courseName: string;
  canReact: boolean;
  canComment: boolean;
  canManage: boolean;
  onComment: (post: StudentFeedPost) => void;
  onDelete?: (post: StudentFeedPost) => void;
}

export function ClassFeedPost({
  post,
  courseName,
  canReact,
  canComment,
  canManage,
  onComment,
  onDelete,
}: ClassFeedPostProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isStudentPost = post.author_actor === 'student';
  const sender = isStudentPost ? post.author_name : courseName;
  const media = post.media.find((item) => item.type === 'image');

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      delayLongPress={350}
      onLongPress={() => {
        if (!canManage || !onDelete) return;
        haptics.medium();
        Alert.alert('Moderate post', undefined, [
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(post) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }}
      className={`mx-5 mb-3 rounded-2xl border p-4 ${
        isStudentPost
          ? 'bg-accent-start/5 border-accent-start/30'
          : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <ThemedText variant="caption" className="font-semibold text-text dark:text-text-dark">
          {isStudentPost ? '🎓 ' : '📚 '}
          {sender}
          {isStudentPost ? ' (Student)' : ''} · {relativeTime(post.published_at ?? post.created_at)}
        </ThemedText>
      </View>
      {post.title ? (
        <ThemedText variant="subheading" className="mb-1 text-text dark:text-text-dark">
          {post.title}
        </ThemedText>
      ) : null}
      <ThemedText variant="body" className="text-text-muted dark:text-text-muted-dark">
        {post.body}
      </ThemedText>
      {media ? (
        <Image source={{ uri: media.url }} style={{ width: '100%', aspectRatio: 16 / 9, marginTop: 12, borderRadius: 12 }} contentFit="cover" />
      ) : null}
      <View className="flex-row items-center gap-4 mt-3">
        {canReact ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="React" className="flex-row items-center gap-1" onPress={() => haptics.light()}>
            <Ionicons name="heart-outline" size={16} color="#ef4444" />
            <ThemedText variant="caption">{post.reactions_count}</ThemedText>
          </TouchableOpacity>
        ) : null}
        {canComment ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Comment"
            className="flex-row items-center gap-1"
            onPress={() => {
              haptics.light();
              onComment(post);
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            <ThemedText variant="caption">{post.comments_count}</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
