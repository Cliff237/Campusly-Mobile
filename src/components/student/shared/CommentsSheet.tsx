import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { relativeTime } from '@/lib/format';
import { addPostComment, fetchPostComments } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import type { PostComment } from '@/lib/types/student';

interface CommentsSheetProps {
  postId: string | null;
  visible: boolean;
  canComment: boolean;
  onClose: () => void;
  onCommented?: () => void;
}

export function CommentsSheet({ postId, visible, canComment, onClose, onCommented }: CommentsSheetProps) {
  const { accessToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !postId || !accessToken) return;
    let cancelled = false;
    setLoading(true);
    fetchPostComments(postId, accessToken)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((error: Error) => showToast.error('Comments', error.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, postId, accessToken]);

  const submit = async () => {
    if (!postId || !accessToken || !body.trim()) return;
    setSending(true);
    try {
      const comment = await addPostComment(postId, body.trim(), accessToken);
      setComments((prev) => [...prev, comment]);
      setBody('');
      onCommented?.();
      haptics.success();
    } catch (error) {
      showToast.error('Comment failed', error instanceof Error ? error.message : 'Try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close comments" />
        <View className="max-h-[70%] rounded-t-3xl bg-surface dark:bg-surface-dark px-5 pt-4 pb-8">
          <View className="w-10 h-1 rounded-full bg-border dark:bg-border-dark self-center mb-4" />
          <ThemedText variant="heading" className="mb-3">Comments</ThemedText>
          {loading ? (
            <ActivityIndicator color="#4f46e5" className="py-8" />
          ) : (
            <ScrollView className="mb-3">
              {comments.length === 0 ? (
                <ThemedText variant="muted" className="py-6 text-center">No comments yet.</ThemedText>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} className="mb-3">
                    <ThemedText variant="caption" className="font-semibold text-text dark:text-text-dark">
                      {comment.author_name} · {relativeTime(comment.created_at)}
                    </ThemedText>
                    <ThemedText variant="body">{comment.body}</ThemedText>
                  </View>
                ))
              )}
            </ScrollView>
          )}
          {canComment ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Write a comment"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                className="flex-1 rounded-xl border border-border dark:border-border-dark px-3 py-3 text-text dark:text-text-dark"
                accessibilityLabel="Comment input"
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Send comment"
                disabled={sending}
                onPress={() => void submit()}
                className="rounded-xl bg-accent-start px-4 py-3"
              >
                <ThemedText variant="caption" className="text-white font-semibold">Send</ThemedText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
