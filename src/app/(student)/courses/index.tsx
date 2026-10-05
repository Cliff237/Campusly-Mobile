import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, RefreshControl, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { href } from '@/lib/href';
import { CourseCard } from '@/components/student/courses/CourseCard';
import { EmptyState } from '@/ui/EmptyState';
import { SearchField } from '@/ui/SearchField';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import type { StudentCourse } from '@/lib/types/student';
import { fetchStudentDashboard } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';

export default function CoursesListScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { accessToken, currentMembership } = useAuth();
  const bottomOffset = useBottomTabOffset(28);

  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !currentMembership) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const dashboard = await fetchStudentDashboard(currentMembership.institution_id, accessToken);
        setCourses(dashboard.courses || []);
      } catch (error) {
        showToast.error('Courses', error instanceof Error ? error.message : 'Could not load courses');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, currentMembership]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.trim().toLowerCase();
    return courses.filter(
      (c) =>
        c.course_name.toLowerCase().includes(q) ||
        c.course_code.toLowerCase().includes(q) ||
        (c.teacher_name && c.teacher_name.toLowerCase().includes(q))
    );
  }, [courses, search]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 14, paddingBottom: bottomOffset, flexGrow: 1 }}
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
      {/* Title Header */}
      <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <AppText variant="title" weight="extrabold">
              My Courses
            </AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
              Class discussion channels, course materials & attendance
            </AppText>
          </View>

          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: colors.brandSoft,
              borderWidth: 1,
              borderColor: 'rgba(91, 63, 209, 0.2)',
            }}
          >
            <AppText variant="caption" weight="extrabold" tone="brand">
              {courses.length} Enrolled
            </AppText>
          </View>
        </View>
      </View>

      {/* Search Field */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <SearchField
          placeholder="Search by course code, title, or professor…"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Course List or Empty State */}
      {loading && !refreshing ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color={colors.brand} size="large" />
          <AppText variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading enrolled courses…
          </AppText>
        </View>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title={search ? 'No matching courses' : 'No enrolled courses'}
          message={
            search
              ? `No courses found matching "${search}". Check your spelling or try another term.`
              : 'You are not currently enrolled in any courses for this term.'
          }
        />
      ) : (
        filteredCourses.map((course) => (
          <CourseCard
            key={course.class_id || course.course_id}
            course={course}
            onPress={() => router.push(href(`/(student)/courses/${course.course_id}`))}
          />
        ))
      )}
    </ScrollView>
  );
}
