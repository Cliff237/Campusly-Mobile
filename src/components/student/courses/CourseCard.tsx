import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import type { StudentCourse } from '@/lib/types/student';

interface CourseCardProps {
  course: StudentCourse;
  onPress: (course: StudentCourse) => void;
}

export const CourseCard = memo(function CourseCard({ course, onPress }: CourseCardProps) {
  const { colors, isDark } = useAppTheme();
  const initial = (course.course_code || course.course_name || 'CS').trim().slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={course.course_name}
      activeOpacity={0.82}
      onPress={() => {
        haptics.light();
        onPress(course);
      }}
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(91, 63, 209, 0.08)',
        elevation: 2,
        shadowColor: '#3A1E82',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* Course Monogram Box */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            backgroundColor: colors.brandSoft,
            borderWidth: 1.5,
            borderColor: 'rgba(91, 63, 209, 0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="heading" weight="extrabold" tone="brand" style={{ fontSize: 16 }}>
            {initial}
          </AppText>
        </View>

        {/* Course Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <AppText variant="label" weight="extrabold" numberOfLines={1} style={{ flex: 1 }}>
              {course.course_name}
            </AppText>

            {course.section ? (
              <View
                style={{
                  backgroundColor: colors.surfaceMuted,
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 8,
                }}
              >
                <AppText variant="caption" weight="bold" tone="muted" style={{ fontSize: 10.5 }}>
                  Sec {course.section}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <AppText variant="caption" weight="extrabold" tone="brand" style={{ fontSize: 11.5 }}>
              {course.course_code}
            </AppText>
            <AppText variant="caption" tone="muted">
              •
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.5, flex: 1 }}>
              <Ionicons name="person-circle-outline" size={13} color={colors.textMuted} />
              <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                {course.teacher_name || 'Faculty Professor'}
              </AppText>
            </View>
          </View>

          {/* Schedule or room badge */}
          {course.schedule ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSubtle} />
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {course.schedule}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Unread badge & Chevron */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {course.unread_count && course.unread_count > 0 ? (
            <View
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 5,
              }}
            >
              <AppText variant="caption" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 10 }}>
                {course.unread_count}
              </AppText>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </View>
      </View>
    </TouchableOpacity>
  );
});
