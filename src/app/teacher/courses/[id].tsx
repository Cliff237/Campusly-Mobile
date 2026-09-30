import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Linking, PanResponder, Platform, RefreshControl, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { API_URL } from '@/lib/config';
import { createInstitutionPost, fetchInstitutionMemberPosts, togglePostReaction, uploadPostMedia } from '@/lib/api/student';
import type { PostMedia, StudentFeedPost } from '@/lib/types/student';

export default function TeacherCourseThread() {
  const { id, name, classId } = useLocalSearchParams<{ id: string; name?: string; classId?: string }>();
  const router = useRouter();
  const { accessToken, currentMembership, user } = useAuth();
  const { hasPermission, hasAny } = usePermissions();
  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<PostMedia | null>(null);
  const messagesRef = useRef<ScrollView>(null);
  const attendancePosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const attendancePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderMove: Animated.event([null, { dx: attendancePosition.x, dy: attendancePosition.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => Animated.spring(attendancePosition, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
  })).current;

  const load = useCallback(async (refresh = false) => {
    if (!accessToken || !currentMembership || !id) return;
    setRefreshing(refresh);
    try {
      const messages = await fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, { scope: 'course_specific', course_id: id });
      setPosts(messages.reverse());
      requestAnimationFrame(() => messagesRef.current?.scrollToEnd({ animated: false }));
    } catch (error) {
      console.error('[Teacher course thread] load failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, currentMembership, id]);

  useEffect(() => { void load(); }, [load]);

  const react = async (post: StudentFeedPost) => {
    if (!accessToken) return;
    const update = await togglePostReaction(post.id, accessToken);
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, ...update } : item));
  };

  const canSendMessage = hasAny(['publish_academic', 'publish_general', 'post_to_feed']);
  const title = name || 'Course group';

  const sendMessage = async () => {
    const body = message.trim();
    if ((!body && !attachment) || !accessToken || !currentMembership || !id || sending) return;
    setSending(true);
    try {
      const uploadedMedia = attachment ? [await uploadPostMedia(attachment, accessToken)] : [];
      await createInstitutionPost(currentMembership.institution_id, {
        title: '',
        body,
        category: 'academic',
        scope: 'course_specific',
        course_id: id,
        allow_reactions: true,
        allow_comments: false,
        media: uploadedMedia,
      }, accessToken);
      setMessage('');
      setAttachment(null);
      await load(true);
    } catch (error) {
      console.error('[Teacher course thread] send failed', error);
    } finally {
      setSending(false);
    }
  };

  const pickAttachment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, allowsMultipleSelection: false });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setAttachment({ id: `chat_${Date.now()}`, type: asset.type === 'video' ? 'video' : 'image', url: asset.uri, label: asset.fileName || 'Attachment', file_name: asset.fileName || undefined, mime_type: asset.mimeType, file_size: asset.fileSize, file: asset.file });
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-mist dark:bg-bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <View className="flex-row items-center border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color="#17332f" />
        </TouchableOpacity>
        <View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center mr-3">
          <ThemedText variant="subheading" className="text-primary">{title.slice(0, 1).toUpperCase()}</ThemedText>
        </View>
        <TouchableOpacity className="flex-1" onPress={() => router.push(`/teacher/courses/${id}/settings?name=${encodeURIComponent(title)}` as any)}>
          <ThemedText variant="subheading" numberOfLines={1}>{title}</ThemedText>
          <ThemedText variant="tiny">Class course group</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        ref={messagesRef}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 24, flexGrow: 1, justifyContent: posts.length ? 'flex-end' : 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#0f766e" />}
      >
        <View className="self-center rounded-full bg-primary-soft px-3 py-1 mb-4">
          <ThemedText variant="tiny" className="text-primary">Messages for this course class</ThemedText>
        </View>
        {posts.length ? posts.map((post) => {
          const mine = post.author_user_id === user?.id;
          const report = post.metadata?.attendance_report as { present?: number; absent?: number; pdf_url?: string } | undefined;
          const reportUrl = report?.pdf_url ? (report.pdf_url.startsWith('/') ? `${API_URL}${report.pdf_url}` : report.pdf_url) : null;
          return (
            <View key={post.id} className={`mx-4 mb-3 max-w-[88%] rounded-3xl overflow-hidden ${report ? 'self-stretch bg-ink' : `px-4 py-3 ${mine ? 'self-end rounded-tr-md bg-message-out dark:bg-message-out-dark' : 'self-start rounded-tl-md bg-message-in dark:bg-surface-dark border border-border dark:border-border-dark'}`}`}>
              {report ? <View className="bg-sun px-4 py-3 flex-row items-center"><Ionicons name="checkmark-done-circle" size={24} color="#fff" /><View className="ml-2"><ThemedText variant="tiny" className="text-white/80 font-semibold">SESSION COMPLETE</ThemedText><ThemedText variant="caption" className="text-white font-bold">Attendance report published</ThemedText></View></View> : null}
              <View className={report ? 'px-4 py-3' : ''}>
                <ThemedText variant="tiny" className={report ? 'text-white/70 font-semibold' : mine ? 'text-ocean-deep dark:text-ocean-soft font-semibold' : 'text-primary font-semibold'}>{post.author_name}</ThemedText>
                {post.title ? <ThemedText variant="subheading" className={`mt-1 ${report ? 'text-white' : ''}`}>{post.title}</ThemedText> : null}
                <ThemedText variant="body" className={`mt-1 ${report ? 'text-white' : ''}`}>{post.body}</ThemedText>
                {report ? <TouchableOpacity disabled={!reportUrl} onPress={() => reportUrl ? void Linking.openURL(reportUrl) : undefined} className="mt-3 rounded-2xl bg-white/10 px-3 py-3 flex-row items-center"><Ionicons name="download-outline" size={19} color="#fbbf24" /><ThemedText variant="caption" className="flex-1 ml-2 text-white font-semibold">Download PDF report</ThemedText><ThemedText variant="tiny" className="text-white/70">{report.present ?? 0} present · {report.absent ?? 0} absent</ThemedText></TouchableOpacity> : null}
              </View>
              <View className="flex-row items-center justify-end mt-2">
                <TouchableOpacity onPress={() => void react(post)} className="flex-row items-center">
                  <Ionicons name={post.is_reacted ? 'heart' : 'heart-outline'} size={17} color={post.is_reacted ? '#d15a67' : '#607873'} />
                  <ThemedText variant="tiny" className="ml-1">{post.reactions_count || ''}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          );
        }) : <EmptyStateAnimation icon="chatbubble-ellipses-outline" title="No course messages" subtitle="Share the first update with your students." />}
      </ScrollView>

      {hasPermission('start_attendance') ? (
        <Animated.View {...attendancePan.panHandlers} style={{ position: 'absolute', right: 20, bottom: 96, transform: attendancePosition.getTranslateTransform() }}>
          <TouchableOpacity onPress={() => router.push(`/teacher/attendance/configure?classId=${classId || ''}&courseId=${id || ''}&courseName=${encodeURIComponent(title)}` as any)} className="h-14 w-14 rounded-full bg-sun items-center justify-center shadow-lg">
            <Ionicons name="radio-outline" size={23} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      ) : null}
      {canSendMessage ? (
        <View className="border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-3 py-2">
          <View className="flex-row items-end rounded-3xl bg-mist dark:bg-surface-hover-dark px-2 py-1">
            <TouchableOpacity onPress={() => void pickAttachment()} className="mb-0.5 h-10 w-10 items-center justify-center">
              <Ionicons name="add-circle-outline" size={23} color="#6d28d9" />
            </TouchableOpacity>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write to the class..."
              placeholderTextColor="#706b82"
              multiline
              maxLength={2000}
              editable={!sending}
              className="max-h-28 flex-1 px-3 py-2.5 text-text dark:text-text-dark"
            />
            <TouchableOpacity disabled={(!message.trim() && !attachment) || sending} onPress={() => void sendMessage()} className={`mb-0.5 h-10 w-10 items-center justify-center rounded-full ${(message.trim() || attachment) && !sending ? 'bg-primary' : 'bg-border dark:bg-border-dark'}`}>
              <Ionicons name={sending ? 'ellipsis-horizontal' : 'send'} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {attachment ? <View className="mt-2 flex-row items-center"><Image source={{ uri: attachment.url }} className="h-12 w-12 rounded-xl" /><ThemedText variant="tiny" className="ml-2 flex-1" numberOfLines={1}>{attachment.label}</ThemedText><TouchableOpacity onPress={() => setAttachment(null)}><Ionicons name="close-circle" size={20} color="#c2415f" /></TouchableOpacity></View> : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
