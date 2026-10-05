import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import { fetchInstitutionMemberPosts, togglePostReaction } from '@/lib/api/student';
import { FeedPostCard } from '@/components/student/home/FeedPostCard';
import type { TeacherClass } from '@/lib/types/teacherMarks';
import type { StudentFeedPost, StudentPostCategory } from '@/lib/types/student';

const FEED_FILTERS = [
  { value: 'all', label: 'All Updates' },
  { value: 'event', label: 'Events' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'achievement', label: 'Achievements' },
  { value: 'academic', label: 'Academic' },
] as const;

export default function TeacherHomeScreen() {
  const router = useRouter();
  const { colors, shadow } = useAppTheme();
  const bottomOffset = useBottomTabOffset(36);
  const { accessToken, currentMembership, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [posts, setPosts] = useState<StudentFeedPost[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken || !currentMembership) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [classList, institutionPosts] = await Promise.all([
          fetchTeacherClasses(accessToken),
          fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, {
            scope: 'institution_wide',
          }),
        ]);
        setClasses(classList);
        setPosts(institutionPosts);
      } catch (error) {
        console.error('[Teacher home] loading failed', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, currentMembership],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = user?.full_name?.split(' ')[0] || 'Teacher';
  const totalStudents = useMemo(
    () => classes.reduce((sum, item) => sum + (item.enrolled_count || 0), 0),
    [classes],
  );
  const first = classes[0];

  const filteredPosts = useMemo(() => {
    if (selectedFilter === 'all') return posts;
    return posts.filter((p) => p.category === (selectedFilter as StudentPostCategory));
  }, [posts, selectedFilter]);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomOffset }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={colors.brand}
          colors={[colors.brand]}
        />
      }
    >
      {/* Top Welcome Banner Card */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            backgroundColor: '#1E143E',
            position: 'relative',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            elevation: 6,
            shadowColor: '#43299F',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
          }}
        >
          <LinearGradient
            colors={['#1D1242', '#3A1E82', '#5B3FD1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Decorative ambient circles */}
          <View
            style={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              top: -60,
              right: -40,
              pointerEvents: 'none',
            }}
          />

          <View style={{ padding: 22 }}>
            {/* Top row with date and campus badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="school-outline" size={14} color="#D1C6FF" />
                <AppText variant="caption" weight="semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                  {currentMembership?.institution_name || 'Academic Campus'}
                </AppText>
              </View>

              <AppText variant="caption" weight="medium" style={{ color: '#DDD5FF' }}>
                {todayFormatted}
              </AppText>
            </View>

            {/* Greeting */}
            <AppText variant="display" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 26, lineHeight: 32 }}>
              Good day, {firstName}
            </AppText>
            <AppText variant="body" style={{ color: '#DDD5FF', marginTop: 4 }}>
              Here is your teaching load and today’s campus activity.
            </AppText>

            {/* Quick Metrics Bar */}
            <View
              style={{
                flexDirection: 'row',
                marginTop: 20,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.15)',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <AppText variant="overline" weight="bold" style={{ color: '#C2B4FB', letterSpacing: 0.8 }}>
                  ASSIGNED CLASSES
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 22 }}>
                    {classes.length}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#D1C6FF' }}>
                    courses
                  </AppText>
                </View>
              </View>

              <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

              <View>
                <AppText variant="overline" weight="bold" style={{ color: '#C2B4FB', letterSpacing: 0.8 }}>
                  TOTAL STUDENTS
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 22 }}>
                    {totalStudents}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#D1C6FF' }}>
                    enrolled
                  </AppText>
                </View>
              </View>

              <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

              <View>
                <AppText variant="overline" weight="bold" style={{ color: '#C2B4FB', letterSpacing: 0.8 }}>
                  BEACON STATUS
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' }} />
                  <AppText variant="caption" weight="bold" style={{ color: '#34D399' }}>
                    Ready
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Next Class / Priority Spotlight Card */}
      {first ? (
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash-outline" size={18} color={colors.brand} />
              <AppText variant="subheading" weight="bold">
                Teaching Spotlight
              </AppText>
            </View>
            <AppText variant="caption" tone="muted">
              Next scheduled
            </AppText>
          </View>

          <View
            style={{
              borderRadius: 24,
              backgroundColor: colors.surface,
              padding: 18,
              borderWidth: 1,
              borderColor: colors.border,
              elevation: 2,
              shadowColor: '#1B1730',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: colors.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(91, 63, 209, 0.2)',
                }}
              >
                <AppText variant="heading" weight="extrabold" tone="brand">
                  {first.course_code.slice(0, 2).toUpperCase()}
                </AppText>
              </View>

              <View style={{ flex: 1 }}>
                <AppText variant="label" weight="extrabold" numberOfLines={1}>
                  {first.course_name}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {first.course_code} · {first.section} · {first.enrolled_count} students
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {hasPermission('start_attendance') ? (
                <TouchableOpacity
                  onPress={() => {
                    haptics.medium();
                    router.push(
                      `/teacher/attendance/configure?classId=${first.id}&courseId=${first.course_id}&courseName=${encodeURIComponent(
                        first.course_name,
                      )}` as any,
                    );
                  }}
                  style={{
                    flex: 1.2,
                    borderRadius: 16,
                    backgroundColor: colors.brand,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  <Ionicons name="radio-outline" size={18} color="#FFFFFF" />
                  <AppText variant="label" weight="bold" style={{ color: '#FFFFFF' }}>
                    Run Attendance
                  </AppText>
                </TouchableOpacity>
              ) : null}

              {hasPermission('view_grades') ? (
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    router.push('/teacher/marks');
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <Ionicons name="create-outline" size={17} color={colors.text} />
                  <AppText variant="label" weight="semibold">
                    Marks
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* Quick Action Grid */}
      <View style={{ paddingHorizontal: 20, marginTop: 26 }}>
        <AppText variant="subheading" weight="bold" style={{ marginBottom: 12 }}>
          Workspace Hub
        </AppText>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <QuickActionTile
            icon="book-outline"
            title="Courses"
            subtitle={`${classes.length} class channels`}
            color="#5B3FD1"
            bg={colors.brandSoft}
            onPress={() => router.push('/teacher/courses')}
          />
          <QuickActionTile
            icon="people-outline"
            title="Class Roster"
            subtitle="Student directories"
            color="#0F7A56"
            bg="#E1F6EE"
            onPress={() => router.push('/teacher/roster')}
          />
          <QuickActionTile
            icon="trophy-outline"
            title="Gradebook"
            subtitle="Manage assessments"
            color="#D97706"
            bg="#FEF3D7"
            onPress={() => router.push('/teacher/marks')}
          />
          <QuickActionTile
            icon="calendar-outline"
            title="Schedule"
            subtitle="Teaching timetable"
            color="#2563B8"
            bg="#E7F0FC"
            onPress={() => router.push('/teacher/schedule')}
          />
        </View>
      </View>

      {/* Institution Feed Section with Category Filter Chips */}
      <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="newspaper-outline" size={18} color={colors.brand} />
            <AppText variant="subheading" weight="bold">
              Campus Highlights
            </AppText>
          </View>
          {loading && !refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : null}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        >
          {FEED_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={selectedFilter === f.value}
              onPress={() => {
                haptics.light();
                setSelectedFilter(f.value);
              }}
            />
          ))}
        </ScrollView>

        {/* Posts List */}
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              canReact={hasPermission('react_to_posts')}
              canComment={hasPermission('comment_on_posts')}
              canManage={post.author_user_id === user?.id}
              onComment={() => undefined}
              onLike={async (item) => {
                if (!accessToken) return;
                const result = await togglePostReaction(item.id, accessToken);
                setPosts((items) =>
                  items.map((current) => (current.id === item.id ? { ...current, ...result } : current)),
                );
              }}
              onMediaPress={() => undefined}
            />
          ))
        ) : loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <EmptyState
            icon="newspaper-outline"
            title="No campus updates"
            message="No posts matching this category yet."
          />
        )}
      </View>
    </ScrollView>
  );
}

function QuickActionTile({
  icon,
  title,
  subtitle,
  color,
  bg,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={() => {
        haptics.light();
        onPress();
      }}
      activeOpacity={0.75}
      style={{
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
        shadowColor: '#1B1730',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <AppText variant="label" weight="bold">
        {title}
      </AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
        {subtitle}
      </AppText>
    </TouchableOpacity>
  );
}
