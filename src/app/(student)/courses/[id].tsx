import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { href } from '@/lib/href';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { showToast } from '@/ui/Toast';
import { useAppTheme } from '@/ui/useAppTheme';
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

function MessageBubble({
  post,
  onReact,
  canReact,
}: {
  post: StudentFeedPost;
  onReact: () => void;
  canReact: boolean;
}) {
  const { colors } = useAppTheme();
  const media = post.media[0];
  const survey = post.metadata?.survey as
    | { question?: string; options?: { label: string; votes?: number }[] }
    | undefined;
  const attendanceReport = post.metadata?.attendance_report as
    | { present?: number; absent?: number; pdf_url?: string }
    | undefined;

  return (
    <View style={{ marginBottom: 14, alignItems: 'flex-start', paddingHorizontal: 16 }}>
      <View
        style={{
          maxWidth: '90%',
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: attendanceReport ? '#171229' : colors.surface,
          borderWidth: 1,
          borderColor: attendanceReport ? '#2E2650' : colors.border,
          elevation: 1,
          shadowColor: '#1B1730',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        }}
      >
        {/* Attendance Banner */}
        {attendanceReport ? (
          <View
            style={{
              backgroundColor: '#D97706',
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
            <View>
              <AppText variant="overline" weight="extrabold" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                SESSION COMPLETE
              </AppText>
              <AppText variant="label" weight="extrabold" style={{ color: '#FFFFFF' }}>
                Attendance Report Ready
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Media Preview */}
        {media?.type === 'image' ? (
          <Image source={{ uri: media.url }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
        ) : null}

        {media?.type === 'video' ? (
          <View style={{ width: 260, height: 160, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play-circle" size={40} color="#FFFFFF" />
          </View>
        ) : null}

        {/* Bubble Text & Content */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
          <AppText
            variant="caption"
            weight="extrabold"
            style={{ color: attendanceReport ? '#6EE7B7' : colors.brand }}
          >
            {post.author_name}
          </AppText>

          {post.title ? (
            <AppText
              variant="label"
              weight="extrabold"
              style={{
                marginTop: 4,
                color: attendanceReport ? '#FFFFFF' : colors.text,
              }}
            >
              {post.title}
            </AppText>
          ) : null}

          {post.body ? (
            <AppText
              variant="body"
              style={{
                marginTop: 4,
                lineHeight: 21,
                color: attendanceReport ? '#E2E8F0' : colors.text,
              }}
            >
              {post.body}
            </AppText>
          ) : null}

          {/* Document Attachment */}
          {media?.type === 'document' ? (
            <TouchableOpacity
              onPress={() => media.url && Linking.openURL(media.url)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceMuted,
                borderRadius: 14,
                padding: 12,
                marginTop: 10,
                gap: 10,
              }}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" numberOfLines={1}>
                  {media.label ?? media.file_name ?? 'Course Document'}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ fontSize: 11 }}>
                  Tap to view document
                </AppText>
              </View>
              <Ionicons name="download-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          {/* Attendance Report Download */}
          {attendanceReport ? (
            <TouchableOpacity
              disabled={!attendanceReport.pdf_url}
              onPress={() =>
                attendanceReport.pdf_url
                  ? void Linking.openURL(
                      attendanceReport.pdf_url.startsWith('/')
                        ? `${API_URL}${attendanceReport.pdf_url}`
                        : attendanceReport.pdf_url,
                    )
                  : undefined
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 14,
                padding: 12,
                marginTop: 12,
                gap: 10,
              }}
            >
              <Ionicons name="document-text-outline" size={20} color="#FBBF24" />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF' }}>
                  Download PDF Report
                </AppText>
                <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }}>
                  {attendanceReport.present ?? 0} present · {attendanceReport.absent ?? 0} absent
                </AppText>
              </View>
              <Ionicons name="download-outline" size={18} color="#FBBF24" />
            </TouchableOpacity>
          ) : null}

          {/* Class Survey */}
          {survey ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <AppText variant="caption" weight="bold">
                {survey.question ?? 'Class Survey'}
              </AppText>
              {survey.options?.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  onPress={onReact}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.brand,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <AppText variant="caption" weight="medium">
                    {option.label}
                  </AppText>
                  <AppText variant="caption" weight="bold" tone="brand">
                    {option.votes ?? 0} votes
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Footer Reaction / Timestamp */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
            <TouchableOpacity
              disabled={!canReact}
              onPress={onReact}
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}
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
                  style={{ color: post.is_reacted ? colors.danger : colors.textMuted, marginLeft: 4 }}
                >
                  {post.reactions_count}
                </AppText>
              ) : null}
            </TouchableOpacity>
            <AppText variant="caption" tone="muted" style={{ fontSize: 10 }}>
              {formatTime(post.published_at ?? post.created_at)}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(insets.bottom, 16) + 16;
  const attendanceBottom = fabBottom + 64;
  const listPaddingBottom = attendanceBottom + 70;
  const { accessToken, currentMembership } = useAuth();
  const { hasPermission } = usePermissions();

  const [course, setCourse] = useState<StudentCourse | null>(null);
  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken || !currentMembership || !id) return;
      setRefreshing(refresh);
      try {
        const [updates, dashboard] = await Promise.all([
          fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, {
            scope: 'course_specific',
            course_id: id,
          }),
          fetchStudentDashboard(currentMembership.institution_id, accessToken),
        ]);
        setPosts(updates);
        setCourse(dashboard.courses.find((item) => item.course_id === id) ?? null);
      } catch (error) {
        showToast.error('Course channel', error instanceof Error ? error.message : 'Could not load this channel');
      } finally {
        setRefreshing(false);
      }
    },
    [accessToken, currentMembership, id],
  );

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const react = async (post: StudentFeedPost) => {
    if (!accessToken) return;
    try {
      const result = await togglePostReaction(post.id, accessToken);
      setPosts((all) => all.map((item) => (item.id === post.id ? { ...item, ...result } : item)));
    } catch {
      showToast.error('Reaction', 'Could not update your reaction');
    }
  };

  const title = course?.course_name ?? 'Course Channel';
  const initial = (course?.course_code || title).trim().slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(student)/courses');
            }
          }}
          style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
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
            {initial}
          </AppText>
        </View>

        <View style={{ flex: 1 }}>
          <AppText variant="label" weight="extrabold" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
            {course?.teacher_name ?? 'Teacher'} · {course?.course_code ?? ''}
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
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
          <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: listPaddingBottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />
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
          <AppText variant="caption" weight="medium" tone="muted">
            Official Course Channel & Announcements
          </AppText>
        </View>

        {posts.length ? (
          posts.map((post) => (
            <MessageBubble
              key={post.id}
              post={post}
              onReact={() => void react(post)}
              canReact={hasPermission('react_to_posts')}
            />
          ))
        ) : (
          <EmptyState
            icon="megaphone-outline"
            title="No course announcements"
            message="New course updates, materials, and sessions will appear here."
          />
        )}
      </ScrollView>

      {/* Floating Action Buttons */}
      <PermissionGate permission="start_attendance">
        <TouchableOpacity
          onPress={() =>
            router.push(
              href(
                `/(student)/attendance/configure?classId=${course?.class_id ?? ''}&courseId=${id ?? ''}&courseName=${encodeURIComponent(
                  title,
                )}`,
              ),
            )
          }
          style={{
            position: 'absolute',
            right: 20,
            bottom: attendanceBottom,
            borderRadius: 20,
            backgroundColor: colors.warning,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
          }}
        >
          <Ionicons name="radio" size={18} color="#FFFFFF" />
          <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF' }}>
            Attendance
          </AppText>
        </TouchableOpacity>
      </PermissionGate>

      <PermissionGate permission="post_to_feed">
        <TouchableOpacity
          onPress={() => setComposerOpen(true)}
          style={{
            position: 'absolute',
            right: 20,
            bottom: fabBottom,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 5,
            shadowColor: '#5B3FD1',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </PermissionGate>

      <PostComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => void load(true)}
        defaultScope="course_specific"
        courseId={id}
      />

      {/* Redesigned Channel Settings Modal / Sheet */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(10, 8, 20, 0.5)',
            justifyContent: 'flex-start',
            paddingTop: 80,
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: colors.border,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppText variant="overline" weight="extrabold" tone="muted" style={{ letterSpacing: 1 }}>
                CHANNEL OPTIONS
              </AppText>
              <TouchableOpacity onPress={() => setMenuOpen(false)}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'Course details & Syllabus', icon: 'information-circle-outline' as const },
              { label: 'Shared media & Resources', icon: 'folder-outline' as const },
              { label: 'Class members & Teacher', icon: 'people-outline' as const },
              { label: 'Past attendance sessions', icon: 'calendar-outline' as const },
            ].map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  setMenuOpen(false);
                  Alert.alert(item.label, 'This view will connect with course archives and files.');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  gap: 12,
                  borderBottomWidth: idx === 3 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={colors.brand} />
                </View>
                <AppText variant="label" weight="medium" style={{ flex: 1 }}>
                  {item.label}
                </AppText>
                <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
