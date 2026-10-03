import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Linking, PanResponder, Platform, RefreshControl, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { relativeTime, initialsFromName } from '@/lib/format';
import { API_URL } from '@/lib/config';
import { createInstitutionPost, fetchInstitutionMemberPosts, togglePostReaction, uploadPostMedia } from '@/lib/api/student';
import type { PostMedia, StudentFeedPost } from '@/lib/types/student';

export default function TeacherCourseThread() {
  const { id, name, classId } = useLocalSearchParams<{ id: string; name?: string; classId?: string }>();
  const router = useRouter();
  const { accessToken, currentMembership, user } = useAuth();
  const { hasPermission, hasAny } = usePermissions();
  const { colors, shadow, isDark } = useAppTheme();
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F1F0F7' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      {/* ── Conversation header ── */}
      <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 4 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <LinearGradient colors={['#FFFFFF40', '#FFFFFF20']} style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' }}>
          <AppText weight="bold" color="#FFFFFF" style={{ fontSize: 16 }}>{initialsFromName(title)}</AppText>
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText weight="bold" color="#FFFFFF" numberOfLines={1} style={{ fontSize: 16, lineHeight: 20 }}>{title}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7' }} />
            <AppText variant="caption" color="#CFC5FF" style={{ fontSize: 11.5, lineHeight: 14 }}>Class course group</AppText>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Channel settings"
          onPress={() => router.push(`/teacher/courses/${id}/settings?name=${encodeURIComponent(title)}` as any)}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="ellipsis-horizontal" size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        ref={messagesRef}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 20, flexGrow: 1, justifyContent: posts.length ? 'flex-end' : 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
      >
        <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? colors.surfaceMuted : '#FFFFFF', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 16 }}>
          <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
          <AppText variant="caption" tone="muted" weight="semibold" style={{ fontSize: 11.5, lineHeight: 14 }}>Messages for this course class</AppText>
        </View>
        {posts.length ? posts.map((post, index) => {
          const mine = post.author_user_id === user?.id;
          const report = post.metadata?.attendance_report as { present?: number; absent?: number; pdf_url?: string } | undefined;
          const reportUrl = report?.pdf_url ? (report.pdf_url.startsWith('/') ? `${API_URL}${report.pdf_url}` : report.pdf_url) : null;
          return (
            <Reanimated.View key={post.id} entering={FadeInUp.duration(260).delay(Math.min(index, 8) * 30)} style={{ marginHorizontal: 16, marginBottom: 10, maxWidth: '88%', alignSelf: mine ? 'flex-end' : 'flex-start' }}>
              {report ? (
                /* Attendance report — official system card */
                <View style={{ borderRadius: 22, overflow: 'hidden', boxShadow: shadow.md }}>
                  <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 10.5, lineHeight: 13, letterSpacing: 1 }}>SESSION COMPLETE</AppText>
                      <AppText weight="bold" color="#FFFFFF" style={{ fontSize: 13.5, lineHeight: 17 }}>Attendance report published</AppText>
                    </View>
                  </LinearGradient>
                  <View style={{ backgroundColor: isDark ? colors.surface : '#1D1636', padding: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <View style={{ flex: 1, backgroundColor: 'rgba(52,211,153,0.14)', borderRadius: 12, padding: 9 }}>
                        <AppText variant="caption" weight="bold" color="#6EE7B7" style={{ fontSize: 10.5, lineHeight: 13 }}>PRESENT</AppText>
                        <AppText weight="bold" color="#FFFFFF" style={{ fontSize: 19, lineHeight: 24, marginTop: 2 }}>{report.present ?? 0}</AppText>
                      </View>
                      <View style={{ flex: 1, backgroundColor: 'rgba(248,113,113,0.14)', borderRadius: 12, padding: 9 }}>
                        <AppText variant="caption" weight="bold" color="#FCA5A5" style={{ fontSize: 10.5, lineHeight: 13 }}>ABSENT</AppText>
                        <AppText weight="bold" color="#FFFFFF" style={{ fontSize: 19, lineHeight: 24, marginTop: 2 }}>{report.absent ?? 0}</AppText>
                      </View>
                    </View>
                    <TouchableOpacity disabled={!reportUrl} onPress={() => reportUrl ? void Linking.openURL(reportUrl) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 13 }}>
                      <Ionicons name="download-outline" size={18} color="#FBBF24" />
                      <AppText weight="bold" color="#FFFFFF" style={{ fontSize: 13, lineHeight: 17, flex: 1 }}>Download PDF report</AppText>
                      <Ionicons name="open-outline" size={15} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Regular message bubble */
                <View
                  style={{
                    backgroundColor: mine ? colors.brand : colors.surface,
                    borderWidth: mine ? 0 : 1,
                    borderColor: colors.border,
                    borderRadius: 20,
                    borderTopRightRadius: mine ? 6 : 20,
                    borderTopLeftRadius: mine ? 20 : 6,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    boxShadow: shadow.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AppText variant="caption" weight="bold" color={mine ? '#DDD4FF' : colors.brand} style={{ fontSize: 11.5, lineHeight: 14 }}>
                      {mine ? `${post.author_name} · You` : post.author_name}
                    </AppText>
                  </View>
                  {post.title ? <AppText weight="bold" color={mine ? '#FFFFFF' : colors.text} style={{ fontSize: 14.5, lineHeight: 19, marginBottom: 2 }}>{post.title}</AppText> : null}
                  <AppText color={mine ? '#F4F1FF' : colors.text} style={{ fontSize: 14.5, lineHeight: 21 }}>{post.body}</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                    <AppText variant="caption" color={mine ? 'rgba(255,255,255,0.7)' : colors.textMuted} style={{ fontSize: 10.5, lineHeight: 13 }}>
                      {relativeTime(post.published_at ?? post.created_at)}
                    </AppText>
                    <TouchableOpacity onPress={() => void react(post)} accessibilityRole="button" accessibilityLabel="React to message" hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name={post.is_reacted ? 'heart' : 'heart-outline'} size={15} color={post.is_reacted ? (mine ? '#FFB4BC' : colors.danger) : (mine ? 'rgba(255,255,255,0.75)' : colors.textMuted)} />
                      {post.reactions_count ? (
                        <AppText variant="caption" weight="semibold" color={mine ? '#FFFFFF' : colors.textMuted} style={{ fontSize: 11, lineHeight: 14 }}>{post.reactions_count}</AppText>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Reanimated.View>
          );
        }) : <EmptyState icon="chatbubble-ellipses-outline" title="No course messages" message="Share the first update with your students." />}
      </ScrollView>

      {hasPermission('start_attendance') ? (
        <Animated.View {...attendancePan.panHandlers} style={{ position: 'absolute', right: 20, bottom: 96, transform: attendancePosition.getTranslateTransform() }}>
          <TouchableOpacity
            onPress={() => router.push(`/teacher/attendance/configure?classId=${classId || ''}&courseId=${id || ''}&courseName=${encodeURIComponent(title)}` as any)}
            accessibilityRole="button"
            accessibilityLabel="Start attendance"
            style={{ height: 54, width: 54, borderRadius: 27, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.lg }}
          >
            <LinearGradient colors={['#FBBF24', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 54, width: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="radio-outline" size={23} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
      {canSendMessage ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: isDark ? colors.surfaceMuted : '#F1F0F7', borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 4 }}>
            <TouchableOpacity onPress={() => void pickAttachment()} accessibilityRole="button" accessibilityLabel="Add attachment" style={{ height: 40, width: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add-circle-outline" size={24} color={colors.brand} />
            </TouchableOpacity>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write to the class..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              editable={!sending}
              style={{ maxHeight: 112, flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontSize: 15, color: colors.text }}
            />
            <TouchableOpacity
              disabled={(!message.trim() && !attachment) || sending}
              onPress={() => void sendMessage()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={{ height: 40, width: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', opacity: (message.trim() || attachment) && !sending ? 1 : 0.45 }}
            >
              <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={sending ? 'ellipsis-horizontal' : 'send'} size={17} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {attachment ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, borderRadius: 14, padding: 8 }}>
              <Image source={{ uri: attachment.url }} style={{ width: 44, height: 44, borderRadius: 10 }} />
              <AppText variant="caption" weight="semibold" numberOfLines={1} style={{ marginLeft: 10, flex: 1 }}>{attachment.label}</AppText>
              <TouchableOpacity onPress={() => setAttachment(null)} accessibilityRole="button" accessibilityLabel="Remove attachment" hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
