import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import { fetchInstitutionMemberPosts, togglePostReaction } from '@/lib/api/student';
import { FeedPostCard } from '@/components/student/home/FeedPostCard';
import type { TeacherClass } from '@/lib/types/teacherMarks';
import type { StudentFeedPost } from '@/lib/types/student';

export default function TeacherHomeScreen() {
  const router = useRouter(); const { accessToken, currentMembership, user } = useAuth(); const { hasPermission } = usePermissions();
  const [classes, setClasses] = useState<TeacherClass[]>([]); const [posts, setPosts] = useState<StudentFeedPost[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => { if (!accessToken || !currentMembership) return; refresh ? setRefreshing(true) : setLoading(true); try { const [result, institutionPosts] = await Promise.all([fetchTeacherClasses(accessToken), fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, { scope: 'institution_wide' })]); setClasses(result); setPosts(institutionPosts); console.log('[Teacher home] priorities refreshed', { classCount: result.length, postCount: institutionPosts.length, institutionId: currentMembership.institution_id }); } catch (error) { console.error('[Teacher home] loading failed', error); } finally { setLoading(false); setRefreshing(false); } }, [accessToken, currentMembership]);
  useEffect(() => { void load(); }, [load]);
  const first = classes[0];
  return <ScrollView className="flex-1 bg-bg dark:bg-bg-dark" contentContainerStyle={{ padding: 20, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#6d28d9" />}>
    <ThemedText variant="display">Good day, {user?.full_name?.split(' ')[0] || 'Teacher'}</ThemedText>
    <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1 mb-6">{currentMembership?.institution_name}</ThemedText>
    <View className="rounded-3xl bg-ink p-5 mb-6"><View className="flex-row items-center justify-between"><ThemedText variant="subheading" className="text-white">Today’s priorities</ThemedText><Ionicons name="clipboard-outline" size={21} color="#d9d1ff" /></View>
      {loading ? <ActivityIndicator color="#ffffff" className="py-6" /> : !first ? <ThemedText variant="caption" className="text-violet-soft mt-4">No assigned classes yet.</ThemedText> : <>
        {hasPermission('start_attendance') ? <Priority icon="checkmark-circle-outline" title={`Run attendance · ${first.course_name}`} detail="Open session controls for your next class" color="#a7f3d0" action="Configure" onPress={() => router.push(`/teacher/attendance/configure?classId=${first.id}&courseId=${first.course_id}&courseName=${encodeURIComponent(first.course_name)}` as any)} /> : null}
        {hasPermission('view_grades') ? <Priority icon="create-outline" title={`Review marks · ${first.course_name}`} detail="Open class gradebook" color="#fde68a" action="Review" onPress={() => router.push('/teacher/marks')} /> : null}
        <Priority icon="calendar-outline" title={`${classes.length} course${classes.length === 1 ? '' : 's'} this term`} detail="Review your teaching schedule" color="#d9d1ff" action="Schedule" onPress={() => router.push('/teacher/schedule')} />
      </>}</View>
    <View className="flex-row items-center justify-between mb-3"><ThemedText variant="subheading">Teaching overview</ThemedText><ThemedText variant="caption" className="text-primary">{classes.length} classes</ThemedText></View>
    <View className="flex-row gap-3"><QuickCard icon="book-outline" label="Courses" onPress={() => router.push('/teacher/courses')} /><QuickCard icon="people-outline" label="Roster" onPress={() => router.push('/teacher/roster')} /><QuickCard icon="create-outline" label="Marks" onPress={() => router.push('/teacher/marks')} /></View>
    <View className="mt-7"><View className="flex-row items-center justify-between mb-3"><ThemedText variant="subheading">Institution feed</ThemedText><Ionicons name="newspaper-outline" size={20} color="#6d28d9" /></View>{posts.length ? posts.slice(0, 8).map((post) => <FeedPostCard key={post.id} post={post} canReact={hasPermission('react_to_posts')} canComment={hasPermission('comment_on_posts')} canManage={post.author_user_id === user?.id} onComment={() => undefined} onLike={async (item) => { if (!accessToken) return; const result = await togglePostReaction(item.id, accessToken); setPosts((items) => items.map((current) => current.id === item.id ? { ...current, ...result } : current)); }} onMediaPress={() => undefined} />) : <View className="rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-5"><ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">No institution posts yet.</ThemedText></View>}</View>
  </ScrollView>;
}

function Priority({ icon, title, detail, action, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; action: string; color: string; onPress: () => void }) { return <View className="flex-row items-center py-4 border-b border-white/10"><Ionicons name={icon} size={20} color={color} /><View className="flex-1 ml-3"><ThemedText variant="caption" className="text-white font-semibold">{title}</ThemedText><ThemedText variant="tiny" className="text-violet-soft mt-0.5">{detail}</ThemedText></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={action} onPress={onPress} className="rounded-lg bg-white/15 px-3 py-2"><ThemedText variant="tiny" className="text-white font-semibold">{action}</ThemedText></TouchableOpacity></View>; }
function QuickCard({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="flex-1 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark py-4 items-center"><Ionicons name={icon} size={21} color="#6d28d9" /><ThemedText variant="tiny" className="mt-2 font-semibold">{label}</ThemedText></TouchableOpacity>; }
