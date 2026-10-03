import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { showToast } from '@/ui/Toast';
import { useModalPresence } from '@/ui/modalStore';
import { PostComposer } from '@/components/student/home/PostComposer';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { fetchInstitutionMemberPosts, fetchStudentDashboard, togglePostReaction } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { API_URL } from '@/lib/config';
import type { StudentCourse, StudentFeedPost } from '@/lib/types/student';

function formatTime(value: string | null) {
  return new Date(value ?? Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ post, onReact, canReact }: { post: StudentFeedPost; onReact: () => void; canReact: boolean }) {
  const media = post.media[0];
  const survey = post.metadata?.survey as { question?: string; options?: { label: string; votes?: number }[] } | undefined;
  const attendanceReport = post.metadata?.attendance_report as { present?: number; absent?: number; pdf_url?: string } | undefined;
  return (
    <View className="mb-3 items-start px-4">
      <View className={`max-w-[91%] rounded-3xl overflow-hidden ${attendanceReport ? 'bg-ink shadow-lg' : 'rounded-tl-md bg-message-in dark:bg-surface-dark border border-border dark:border-border-dark'}`}>
        {attendanceReport ? <View className="bg-sun px-4 py-3 flex-row items-center"><Ionicons name="checkmark-done-circle" size={24} color="#fff" /><View className="ml-2"><ThemedText variant="tiny" className="text-white/80 font-semibold">SESSION COMPLETE</ThemedText><ThemedText variant="caption" className="text-white font-bold">Attendance report is ready</ThemedText></View></View> : null}
        {media?.type === 'image' ? <Image source={{ uri: media.url }} className="w-full h-52" resizeMode="cover" /> : null}
        {media?.type === 'video' ? <View className="w-64 h-40 bg-ink items-center justify-center"><Ionicons name="play" size={30} color="#fff" /></View> : null}
        <View className="px-4 pt-3 pb-2">
          <ThemedText variant="tiny" className="text-ocean font-semibold">{post.author_name}</ThemedText>
          {post.title ? <ThemedText variant="subheading" className="mt-1 text-text dark:text-text-dark">{post.title}</ThemedText> : null}
          {post.body ? <ThemedText variant="body" className="mt-1 text-text dark:text-text-dark">{post.body}</ThemedText> : null}
          {media?.type === 'document' ? <View className="flex-row items-center bg-mist dark:bg-bg-dark rounded-2xl p-3 mt-3"><Ionicons name="document-text" size={22} color="#0f766e" /><View className="flex-1 ml-2"><ThemedText variant="caption" numberOfLines={1}>{media.label ?? media.file_name ?? 'Course document'}</ThemedText><ThemedText variant="tiny">Tap to open</ThemedText></View><Ionicons name="download-outline" size={19} color="#0f766e" /></View> : null}
          {attendanceReport ? <TouchableOpacity disabled={!attendanceReport.pdf_url} onPress={() => attendanceReport.pdf_url ? void Linking.openURL(attendanceReport.pdf_url.startsWith('/') ? `${API_URL}${attendanceReport.pdf_url}` : attendanceReport.pdf_url) : undefined} className="flex-row items-center bg-white/10 rounded-2xl p-3 mt-3"><Ionicons name="document-text" size={22} color="#fbbf24" /><View className="flex-1 ml-2"><ThemedText variant="caption" className="text-white font-semibold">Download PDF report</ThemedText><ThemedText variant="tiny" className="text-white/70">{attendanceReport.present ?? 0} present · {attendanceReport.absent ?? 0} absent</ThemedText></View><Ionicons name="download-outline" size={19} color="#fbbf24" /></TouchableOpacity> : null}
          {survey ? <View className="mt-3"><ThemedText variant="caption" className="font-semibold">{survey.question ?? 'Quick class survey'}</ThemedText>{survey.options?.map((option) => <TouchableOpacity key={option.label} onPress={onReact} className="border border-ocean rounded-xl px-3 py-2 mt-2 flex-row justify-between"><ThemedText variant="caption">{option.label}</ThemedText><ThemedText variant="tiny">{option.votes ?? 0} votes</ThemedText></TouchableOpacity>)}</View> : null}
          <View className="flex-row items-center justify-end mt-2"><TouchableOpacity disabled={!canReact} onPress={onReact} className="flex-row items-center mr-3"><Ionicons name={post.is_reacted ? 'heart' : 'heart-outline'} size={17} color={post.is_reacted ? '#db2777' : '#64748b'} /><ThemedText variant="tiny" className="ml-1">{post.reactions_count || ''}</ThemedText></TouchableOpacity><ThemedText variant="tiny">{formatTime(post.published_at ?? post.created_at)}</ThemedText></View>
        </View>
      </View>
    </View>
  );
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, currentMembership } = useAuth();
  const { hasPermission } = usePermissions();
  const [course, setCourse] = useState<StudentCourse | null>(null);
  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useModalPresence(menuOpen);
  const load = useCallback(async (refresh = false) => {
    if (!accessToken || !currentMembership || !id) return;
    setRefreshing(refresh);
    try {
      const [updates, dashboard] = await Promise.all([fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, { scope: 'course_specific', course_id: id }), fetchStudentDashboard(currentMembership.institution_id, accessToken)]);
      setPosts(updates); setCourse(dashboard.courses.find((item) => item.course_id === id) ?? null);
    } catch (error) { showToast.error('Course channel', error instanceof Error ? error.message : 'Could not load this channel'); }
    finally { setRefreshing(false); }
  }, [accessToken, currentMembership, id]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);
  const react = async (post: StudentFeedPost) => { if (!accessToken) return; try { const result = await togglePostReaction(post.id, accessToken); setPosts((all) => all.map((item) => item.id === post.id ? { ...item, ...result } : item)); } catch { showToast.error('Reaction', 'Could not update your reaction'); } };
  const title = course?.course_name ?? 'Course channel'; const initial = (course?.course_code || title).charAt(0).toUpperCase();
  return <View className="flex-1 bg-mist dark:bg-bg-dark">
    <View className="bg-surface dark:bg-surface-dark px-4 pt-3 pb-3 flex-row items-center border-b border-border dark:border-border-dark">
      <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center"><Ionicons name="chevron-back" size={25} color="#201d2e" /></TouchableOpacity>
      <View className="w-10 h-10 rounded-xl bg-ocean-soft dark:bg-ocean-deep items-center justify-center mr-3"><ThemedText variant="subheading" className="text-ocean-deep dark:text-ocean-soft">{initial}</ThemedText></View>
      <View className="flex-1"><ThemedText variant="subheading" numberOfLines={1}>{title}</ThemedText><ThemedText variant="tiny">{course?.teacher_name ?? 'Course channel'} · {course?.course_code ?? ''}</ThemedText></View>
      <TouchableOpacity onPress={() => setMenuOpen(true)} className="w-10 h-10 items-center justify-center"><Ionicons name="ellipsis-vertical" size={21} color="#201d2e" /></TouchableOpacity>
    </View>
    <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 16, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#0f766e" />}>
      <View className="self-center rounded-full bg-sun-soft px-3 py-1 mb-4"><ThemedText variant="tiny" className="text-amber-800">Only course administrators can send updates</ThemedText></View>
      {posts.length ? posts.map((post) => <MessageBubble key={post.id} post={post} onReact={() => void react(post)} canReact={hasPermission('react_to_posts')} />) : <EmptyStateAnimation icon="megaphone-outline" title="No updates yet" subtitle="New course announcements and resources will appear here." />}
    </ScrollView>
    <PermissionGate permission="start_attendance"><TouchableOpacity onPress={() => router.push(href(`/(student)/attendance/configure?classId=${course?.class_id ?? ''}&courseId=${id ?? ''}&courseName=${encodeURIComponent(title)}`))} className="absolute right-5 bottom-24 rounded-2xl bg-sun px-4 py-3 flex-row items-center shadow"><Ionicons name="radio-outline" size={19} color="#fff" /><ThemedText variant="caption" className="text-white font-bold ml-2">Attendance</ThemedText></TouchableOpacity></PermissionGate>
    <PermissionGate permission="post_to_feed"><TouchableOpacity onPress={() => setComposerOpen(true)} className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-ocean items-center justify-center shadow"><Ionicons name="add" size={27} color="#fff" /></TouchableOpacity></PermissionGate>
    <PostComposer visible={composerOpen} onClose={() => setComposerOpen(false)} onCreated={() => void load(true)} defaultScope="course_specific" courseId={id} />
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}><TouchableOpacity activeOpacity={1} onPress={() => setMenuOpen(false)} className="flex-1 bg-black/30 justify-start"><View className="mt-20 mx-5 ml-16 rounded-3xl bg-surface dark:bg-surface-dark p-3"><ThemedText variant="tiny" className="px-3 py-2 text-text-muted">CHANNEL SETTINGS</ThemedText>{['Course details and logo', 'Media, links and documents', 'People in this course', 'Past attendance sessions'].map((item) => <TouchableOpacity key={item} onPress={() => { setMenuOpen(false); Alert.alert(item, 'This view will be connected to course settings and records.'); }} className="px-3 py-3"><ThemedText variant="body">{item}</ThemedText></TouchableOpacity>)}</View></TouchableOpacity></Modal>
  </View>;
}
