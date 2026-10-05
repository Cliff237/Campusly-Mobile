import { useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { createInstitutionPost } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { useScreenBottomPadding } from '@/ui/tabBarOptions';
import type { StudentPostCategory } from '@/lib/types/student';

const CATEGORIES: StudentPostCategory[] = [
  'general',
  'event',
  'academic',
  'opportunity',
  'achievement',
  'official_announcement',
];

export default function ComposeScreen() {
  const router = useRouter();
  const bottomPadding = useScreenBottomPadding(40);
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const { accessToken, currentMembership } = useAuth();
  const { hasPermission } = usePermissions();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<StudentPostCategory>('general');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!accessToken || !currentMembership) return;
    if (!body.trim()) {
      showToast.error('Post', 'Body is required');
      return;
    }
    setSubmitting(true);
    try {
      await createInstitutionPost(
        currentMembership.institution_id,
        {
          title: title.trim(),
          body: body.trim(),
          category,
          scope: courseId ? 'course_specific' : 'institution_wide',
          course_id: courseId,
        },
        accessToken,
      );
      haptics.success();
      showToast.success('Posted', 'Your post is live');
      router.back();
    } catch (error) {
      showToast.error('Could not post', error instanceof Error ? error.message : 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasPermission('post_to_feed')) {
    return (
      <EmptyStateAnimation
        icon="lock-closed-outline"
        title="Posting locked"
        subtitle="You need the post_to_feed permission to compose"
      />
    );
  }

  return (
    <PermissionGate permission="post_to_feed">
      <ScrollView className="flex-1 bg-bg dark:bg-bg-dark" contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding }}>
        <ThemedText variant="heading" className="mb-4">Compose post</ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          accessibilityLabel="Title"
          className="rounded-xl border border-border dark:border-border-dark px-3 py-3 mb-3 text-text dark:text-text-dark"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write a rich update…"
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          multiline
          accessibilityLabel="Body"
          className="rounded-xl border border-border dark:border-border-dark px-3 py-3 mb-4 min-h-[180px] text-text dark:text-text-dark"
        />
        <ThemedText variant="caption" className="mb-2">Category</ThemedText>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item}
              accessibilityRole="button"
              accessibilityLabel={item}
              onPress={() => {
                haptics.selection();
                setCategory(item);
              }}
              className={`px-3 py-2 rounded-full border ${
                category === item ? 'bg-accent-start border-accent-start' : 'border-border dark:border-border-dark'
              }`}
            >
              <ThemedText variant="tiny" className={category === item ? 'text-white' : ''}>
                {item.replace('_', ' ')}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Publish"
          disabled={submitting}
          onPress={() => void submit()}
          className="rounded-xl bg-accent-start py-4 items-center"
        >
          <ThemedText variant="body" className="text-white font-semibold">{submitting ? 'Publishing…' : 'Publish'}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </PermissionGate>
  );
}
