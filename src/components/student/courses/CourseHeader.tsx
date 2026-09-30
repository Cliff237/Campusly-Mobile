import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import type { StudentCourse } from '@/lib/types/student';

interface CourseHeaderProps {
  course: StudentCourse;
  onBack: () => void;
}

export function CourseHeader({ course, onBack }: CourseHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="px-5 pt-3 pb-4 border-b border-border dark:border-border-dark bg-bg dark:bg-bg-dark">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => {
          haptics.light();
          onBack();
        }}
        className="w-10 h-10 rounded-full items-center justify-center bg-surface dark:bg-surface-dark mb-3"
      >
        <Ionicons name="chevron-back" size={22} color={isDark ? '#f8fafc' : '#0f172a'} />
      </TouchableOpacity>
      <ThemedText variant="heading">📚 {course.course_name}</ThemedText>
      <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1">
        {course.teacher_name}
        {course.room ? ` • ${course.room}` : ''}
        {course.schedule ? ` • ${course.schedule}` : ''}
      </ThemedText>
      {typeof course.attendance_rate === 'number' ? (
        <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">
          {course.attendance_rate}% attendance
        </ThemedText>
      ) : null}
    </View>
  );
}
