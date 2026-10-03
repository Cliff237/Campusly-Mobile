import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import type { StudentCourse } from '@/lib/types/student';

interface CourseCardProps { course: StudentCourse; onPress: (course: StudentCourse) => void; }

/** Stable per-course gradient so a channel keeps its colour between visits. */
function courseGradient(key: string): [string, string] {
  const palettes: [string, string][] = [
    ['#8B5CF6', '#6D28D9'],
    ['#60A5FA', '#2563B8'],
    ['#34D399', '#0F9F6E'],
    ['#FBBF24', '#D97706'],
    ['#FB7185', '#C8344F'],
    ['#38BDF8', '#0284C7'],
  ];
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palettes[hash % palettes.length];
}

export const CourseCard = memo(function CourseCard({ course, onPress }: CourseCardProps) {
  const { colors, shadow, isDark } = useAppTheme();
  const initial = (course.course_code || course.course_name || 'C').trim().charAt(0).toUpperCase();
  const schedule = course.schedule?.split('·')[0];
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={course.course_name}
      activeOpacity={0.82}
      onPress={() => { haptics.light(); onPress(course); }}
      style={{ marginHorizontal: 16, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, boxShadow: shadow.sm }}
    >
      <LinearGradient colors={courseGradient(course.class_id || course.course_id)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="title" color="#FFFFFF">{initial}</AppText>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0, marginLeft: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText weight="bold" numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>{course.course_name}</AppText>
          {schedule ? (
            <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginLeft: 8 }}>
              <AppText variant="caption" weight="bold" color={colors.brand} numberOfLines={1} style={{ fontSize: 11, lineHeight: 14 }}>{schedule.trim()}</AppText>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
          <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1, marginLeft: 5 }}>
            {course.teacher_name} · {course.course_code}{course.section ? ` · ${course.section}` : ''}
          </AppText>
          {course.unread_count ? (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 }}>
              <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11, lineHeight: 14 }}>{course.unread_count}</AppText>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});
