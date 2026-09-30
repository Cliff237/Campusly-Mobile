import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import type { StudentCourse } from '@/lib/types/student';

interface CourseCardProps { course: StudentCourse; onPress: (course: StudentCourse) => void; }

export const CourseCard = memo(function CourseCard({ course, onPress }: CourseCardProps) {
  const initial = (course.course_code || course.course_name || 'C').trim().charAt(0).toUpperCase();
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={course.course_name} activeOpacity={0.82}
      onPress={() => { haptics.light(); onPress(course); }} className="mx-4 py-3.5 flex-row items-center border-b border-border dark:border-border-dark">
      <View className="w-14 h-14 rounded-2xl bg-ocean-soft items-center justify-center mr-3 dark:bg-ocean-deep">
        <ThemedText variant="heading" className="text-ocean-deep dark:text-ocean-soft">{initial}</ThemedText>
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between">
          <ThemedText variant="subheading" numberOfLines={1} className="flex-1 text-text dark:text-text-dark">{course.course_name}</ThemedText>
          <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark ml-2">{course.schedule?.split('·')[0] ?? 'Course'}</ThemedText>
        </View>
        <View className="flex-row items-center mt-1">
          <Ionicons name="megaphone-outline" size={14} color="#716d80" />
          <ThemedText variant="caption" numberOfLines={1} className="flex-1 text-text-muted dark:text-text-muted-dark ml-1.5">{course.teacher_name} · {course.course_code}{course.section ? ` · ${course.section}` : ''}</ThemedText>
          {course.unread_count ? <View className="min-w-[20px] h-5 rounded-full bg-ocean items-center justify-center px-1.5 ml-2"><ThemedText variant="tiny" className="text-white font-bold">{course.unread_count}</ThemedText></View> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});
