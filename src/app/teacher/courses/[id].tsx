import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { API_URL } from '@/lib/config';
import {
  createInstitutionPost,
  fetchInstitutionMemberPosts,
  togglePostReaction,
  uploadPostMedia,
} from '@/lib/api/student';
import type { PostMedia, StudentFeedPost } from '@/lib/types/student';

export default function TeacherCourseThread() {
  const { id, name, classId } = useLocalSearchParams<{ id: string; name?: string; classId?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { accessToken, currentMembership, user } = useAuth();
  const { hasPermission, hasAny } = usePermissions();

  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<PostMedia | null>(null);
  const messagesRef = useRef<ScrollView>(null);

  const attendancePosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const attendancePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderMove: Animated.event([null, { dx: attendancePosition.x, dy: attendancePosition.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () =>
        Animated.spring(attendancePosition, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
    }),
  ).current;

  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken || !currentMembership || !id) return;
      setRefreshing(refresh);
      try {
        const messages = await fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, {
          scope: 'course_specific',
          course_id: id,
        });
        setPosts(messages.reverse());
        requestAnimationFrame(() => messagesRef.current?.scrollToEnd({ animated: false }));
      } catch (error) {
        console.error('[Teacher course thread] load failed', error);
      } finally {
        setRefreshing(false);
      }
    },
    [accessToken, currentMembership, id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const react = async (post: StudentFeedPost) => {
    if (!accessToken) return;
    haptics.light();
    const update = await togglePostReaction(post.id, accessToken);
    setPosts((items) => items.map((item) => (item.id === post.id ? { ...item, ...update } : item)));
  };

  const canSendMessage = hasAny(['publish_academic', 'publish_general', 'post_to_feed']);
  const title = name || 'Course Channel';

  const sendMessage = async () => {
    const body = message.trim();
    if ((!body && !attachment) || !accessToken || !currentMembership || !id || sending) return;
    setSending(true);
    haptics.light();
    try {
      const uploadedMedia = attachment ? [await uploadPostMedia(attachment, accessToken)] : [];
      await createInstitutionPost(
        currentMembership.institution_id,
        {
          title: '',
          body,
          category: 'academic',
          scope: 'course_specific',
          course_id: id,
          allow_reactions: true,
          allow_comments: false,
          media: uploadedMedia,
        },
        accessToken,
      );
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setAttachment({
      id: `chat_${Date.now()}`,
      type: asset.type === 'video' ? 'video' : 'image',
      url: asset.uri,
      label: asset.fileName || 'Attachment',
      file_name: asset.fileName || undefined,
      mime_type: asset.mimeType,
      file_size: asset.fileSize,
      file: asset.file,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Top Header Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 15,
            backgroundColor: colors.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.brand,
          }}
        >
          <AppText variant="label" weight="extrabold" tone="brand">
            {title.slice(0, 2).toUpperCase()}
          </AppText>
        </View>

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push(`/teacher/courses/${id}/settings?name=${encodeURIComponent(title)}` as any)}
        >
          <AppText variant="label" weight="extrabold" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
            Class Channel · Tap for group settings
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/teacher/courses/${id}/settings?name=${encodeURIComponent(title)}` as any)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="settings-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages ScrollView */}
      <ScrollView
        ref={messagesRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 24,
          flexGrow: 1,
          justifyContent: posts.length ? 'flex-end' : 'center',
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.brand}
          />
        }
      >
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: colors.surfaceMuted,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <AppText variant="caption" weight="semibold" tone="muted">
            Messages & Updates for this Course Class
          </AppText>
        </View>

        {posts.length ? (
          posts.map((post) => {
            const mine = post.author_user_id === user?.id;
            const report = post.metadata?.attendance_report as
              | { present?: number; absent?: number; pdf_url?: string }
              | undefined;
            const reportUrl = report?.pdf_url
              ? report.pdf_url.startsWith('/')
                ? `${API_URL}${report.pdf_url}`
                : report.pdf_url
              : null;

            return (
              <View
                key={post.id}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  maxWidth: '86%',
                  borderRadius: 22,
                  overflow: 'hidden',
                  alignSelf: report ? 'stretch' : mine ? 'flex-end' : 'flex-start',
                  backgroundColor: report
                    ? '#171229'
                    : mine
                    ? colors.brandSoft
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: report
                    ? '#2E2650'
                    : mine
                    ? 'rgba(91, 63, 209, 0.25)'
                    : colors.border,
                  elevation: 1,
                  shadowColor: '#1B1730',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                }}
              >
                {/* Attendance Report Banner */}
                {report ? (
                  <View
                    style={{
                      backgroundColor: '#D97706',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Ionicons name="checkmark-done-circle" size={24} color="#FFFFFF" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="overline" weight="extrabold" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                        SESSION COMPLETE
                      </AppText>
                      <AppText variant="label" weight="extrabold" style={{ color: '#FFFFFF', marginTop: 1 }}>
                        Attendance Report Published
                      </AppText>
                    </View>
                  </View>
                ) : null}

                {/* Message Body Content */}
                <View style={{ padding: 14 }}>
                  <AppText
                    variant="caption"
                    weight="bold"
                    style={{
                      color: report ? '#D1C6FF' : mine ? colors.brand : colors.text,
                    }}
                  >
                    {post.author_name}
                  </AppText>

                  {post.title ? (
                    <AppText
                      variant="label"
                      weight="extrabold"
                      style={{
                        marginTop: 4,
                        color: report ? '#FFFFFF' : colors.text,
                      }}
                    >
                      {post.title}
                    </AppText>
                  ) : null}

                  <AppText
                    variant="body"
                    style={{
                      marginTop: 4,
                      lineHeight: 21,
                      color: report ? '#E2E8F0' : colors.text,
                    }}
                  >
                    {post.body}
                  </AppText>

                  {/* Report Download CTA */}
                  {report ? (
                    <TouchableOpacity
                      disabled={!reportUrl}
                      onPress={() => (reportUrl ? void Linking.openURL(reportUrl) : undefined)}
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Ionicons name="download-outline" size={18} color="#FBBF24" />
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF' }}>
                          Download PDF Report
                        </AppText>
                        <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }}>
                          {report.present ?? 0} present · {report.absent ?? 0} absent
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* Reactions Bar */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => void react(post)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons
                        name={post.is_reacted ? 'heart' : 'heart-outline'}
                        size={16}
                        color={post.is_reacted ? colors.danger : colors.textMuted}
                      />
                      {post.reactions_count > 0 ? (
                        <AppText
                          variant="caption"
                          weight="semibold"
                          style={{ color: post.is_reacted ? colors.danger : colors.textMuted }}
                        >
                          {post.reactions_count}
                        </AppText>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No course updates yet"
            message="Share the first announcement or resources with your enrolled students."
          />
        )}
      </ScrollView>

      {/* Floating Attendance Button with Draggable Pan */}
      {hasPermission('start_attendance') ? (
        <Animated.View
          {...attendancePan.panHandlers}
          style={{
            position: 'absolute',
            right: 20,
            bottom: 92,
            transform: attendancePosition.getTranslateTransform(),
          }}
        >
          <TouchableOpacity
            onPress={() => {
              haptics.medium();
              router.push(
                `/teacher/attendance/configure?classId=${classId || ''}&courseId=${id || ''}&courseName=${encodeURIComponent(
                  title,
                )}` as any,
              );
            }}
            activeOpacity={0.85}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#5B3FD1',
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 6,
              shadowColor: '#5B3FD1',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
            }}
          >
            <Ionicons name="radio-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {/* Input / Composer Bar */}
      {canSendMessage ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              backgroundColor: colors.field,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => void pickAttachment()}
              style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.brand} />
            </TouchableOpacity>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write an announcement or update..."
              placeholderTextColor={colors.textSubtle}
              multiline
              maxLength={2000}
              editable={!sending}
              style={{
                flex: 1,
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 15,
                color: colors.text,
                maxHeight: 110,
              }}
            />

            <TouchableOpacity
              disabled={(!message.trim() && !attachment) || sending}
              onPress={() => void sendMessage()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: (message.trim() || attachment) && !sending ? colors.brand : colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 2,
              }}
            >
              <Ionicons
                name={sending ? 'ellipsis-horizontal' : 'arrow-up'}
                size={18}
                color={(message.trim() || attachment) && !sending ? '#FFFFFF' : colors.textSubtle}
              />
            </TouchableOpacity>
          </View>

          {/* Attachment Preview Chip */}
          {attachment ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 8,
                backgroundColor: colors.surfaceMuted,
                padding: 6,
                borderRadius: 14,
                gap: 8,
              }}
            >
              <Image source={{ uri: attachment.url }} style={{ width: 36, height: 36, borderRadius: 10 }} />
              <AppText variant="caption" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                {attachment.label || 'Attached media'}
              </AppText>
              <TouchableOpacity onPress={() => setAttachment(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
