import { useCallback, useEffect, useState } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { CourseCard } from '@/components/student/courses/CourseCard';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import type { StudentCourse } from '@/lib/types/student';
import { fetchStudentDashboard } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { showToast } from '@/ui/Toast';
import { ThemedText } from '@/ui/ThemedText';

export default function CoursesListScreen() {
  const router = useRouter();
  const { accessToken, currentMembership } = useAuth();
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || !currentMembership) return;
    setRefreshing(isRefresh);
    try {
      setCourses((await fetchStudentDashboard(currentMembership.institution_id, accessToken)).courses);
    } catch (error) {
      showToast.error('Courses', error instanceof Error ? error.message : 'Could not load courses');
    } finally { setRefreshing(false); }
  }, [accessToken, currentMembership]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);

  return (
    <ScrollView
      className="flex-1 bg-bg dark:bg-bg-dark"
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 40, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#0f766e" />}
    >
      <View className="px-5 pb-3">
        <ThemedText variant="display">Courses</ThemedText>
        <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1">Your class channels and learning updates</ThemedText>
      </View>
      {courses.length === 0 ? (
        <EmptyStateAnimation
          icon="book-outline"
          title="No enrolled courses"
          subtitle="Your enrolled classes will appear here"
        />
      ) : (
        courses.map((course) => (
          <CourseCard
            key={course.class_id}
            course={course}
            onPress={() => router.push(href(`/(student)/courses/${course.course_id}`))}
          />
        ))
      )}
    </ScrollView>
  );
}
