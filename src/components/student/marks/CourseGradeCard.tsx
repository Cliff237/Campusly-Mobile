import { useState } from 'react';
import { LayoutAnimation, Platform, TouchableOpacity, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import type { CourseGradeCardData } from '@/lib/types/student';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getGradeMeta(percent: number) {
  if (percent >= 85) {
    return { letter: 'A', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.28)' };
  }
  if (percent >= 70) {
    return { letter: 'B', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.28)' };
  }
  if (percent >= 60) {
    return { letter: 'C', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.28)' };
  }
  return { letter: 'D', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.28)' };
}

export function CourseGradeCard({ course }: { course: CourseGradeCardData & { course_id?: string } }) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);

  const percent = course.total_percent ?? 0;
  const gradeMeta = getGradeMeta(percent);
  const gradeLetter = course.letter_grade ?? gradeMeta.letter;

  const toggle = () => {
    haptics.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  const deductions = course.total_deduction ?? course.attendance_penalty ?? 0;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 24,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#170F2E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.28 : 0.06,
        shadowRadius: 10,
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`View ${course.course_name} grade breakdown`}
        onPress={toggle}
        activeOpacity={0.8}
        style={{ padding: 18 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: gradeMeta.bg,
                borderWidth: 1,
                borderColor: gradeMeta.border,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <AppText variant="heading" weight="extrabold" style={{ color: gradeMeta.color }}>
                {gradeLetter}
              </AppText>
            </View>

            <View style={{ flex: 1 }}>
              <AppText variant="subheading" weight="bold" numberOfLines={1}>
                {course.course_name}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {course.teacher_name ?? 'Faculty Instructor'} · {course.items.length} assessment{course.items.length === 1 ? '' : 's'}
              </AppText>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8 }}>
            <AppText variant="heading" weight="extrabold" style={{ color: gradeMeta.color }}>
              {course.total_percent == null ? '—' : `${percent}%`}
            </AppText>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </View>
          </View>
        </View>

        {/* Progress bar */}
        {course.total_percent != null ? (
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.surfaceMuted,
              overflow: 'hidden',
              marginTop: 14,
            }}
          >
            <View
              style={{
                height: '100%',
                borderRadius: 3,
                backgroundColor: gradeMeta.color,
                width: `${Math.min(100, Math.max(0, percent))}%`,
              }}
            />
          </View>
        ) : null}

        {deductions > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
              backgroundColor: 'rgba(244, 63, 94, 0.08)',
              alignSelf: 'flex-start',
            }}
          >
            <Ionicons name="alert-circle" size={14} color="#F43F5E" />
            <AppText variant="caption" weight="semibold" style={{ color: '#F43F5E' }}>
              -{deductions} mark deduction applied
            </AppText>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Expandable Breakdown Drawer */}
      {open ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 18,
            paddingTop: 16,
            paddingBottom: 18,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <AppText variant="overline" weight="extrabold" tone="muted" style={{ letterSpacing: 0.8 }}>
              ASSESSMENT BREAKDOWN
            </AppText>
            <AppText variant="caption" tone="muted">
              Weights & scores
            </AppText>
          </View>

          {course.items.length ? (
            <>
              {course.items.map((item) => {
                const raw = item.raw_score ?? item.score + (item.deduction ?? 0);
                const itemPercent = item.max_score ? Math.round((item.score / item.max_score) * 100) : 0;
                const itemGrade = getGradeMeta(itemPercent);

                return (
                  <View
                    key={item.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <AppText variant="caption" weight="bold">
                          {item.assessment_name}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                          {item.assessment_type ?? 'Assessment'}
                        </AppText>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          backgroundColor: itemGrade.bg,
                          borderWidth: 1,
                          borderColor: itemGrade.border,
                        }}
                      >
                        <AppText variant="caption" weight="bold" style={{ color: itemGrade.color }}>
                          {itemPercent}%
                        </AppText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <View
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <AppText variant="caption" tone="muted">
                          Raw score
                        </AppText>
                        <AppText variant="caption" weight="bold" style={{ marginTop: 2 }}>
                          {raw} / {item.max_score}
                        </AppText>
                      </View>

                      <View
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <AppText variant="caption" tone="muted">
                          Deduction
                        </AppText>
                        <AppText
                          variant="caption"
                          weight="bold"
                          style={{
                            marginTop: 2,
                            color: (item.deduction ?? 0) > 0 ? '#F43F5E' : colors.textMuted,
                          }}
                        >
                          {(item.deduction ?? 0) > 0 ? `-${item.deduction}` : '0'}
                        </AppText>
                      </View>

                      <View
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <AppText variant="caption" tone="muted">
                          Final score
                        </AppText>
                        <AppText variant="caption" weight="bold" style={{ marginTop: 2, color: colors.brand }}>
                          {item.score} / {item.max_score}
                        </AppText>
                      </View>
                    </View>

                    {item.deduction_reason && (item.deduction ?? 0) > 0 ? (
                      <View
                        style={{
                          marginTop: 8,
                          borderRadius: 10,
                          backgroundColor: isDark ? 'rgba(244, 63, 94, 0.1)' : '#FFF1F2',
                          padding: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Ionicons name="information-circle" size={14} color="#F43F5E" />
                        <AppText variant="caption" style={{ color: '#F43F5E', flex: 1 }}>
                          {item.deduction_reason}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {/* Total Summary Footer */}
              <View
                style={{
                  marginTop: 14,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <AppText variant="caption" tone="muted">
                    Assessment Total
                  </AppText>
                  <AppText variant="body" weight="extrabold" style={{ marginTop: 2 }}>
                    {course.total_percent == null ? 'Pending' : `${course.total_percent}%`}
                  </AppText>
                </View>

                {deductions > 0 ? (
                  <View style={{ alignItems: 'center' }}>
                    <AppText variant="caption" tone="muted">
                      Deductions
                    </AppText>
                    <AppText variant="body" weight="extrabold" style={{ marginTop: 2, color: '#F43F5E' }}>
                      −{deductions}
                    </AppText>
                  </View>
                ) : null}

                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="caption" tone="muted">
                    Final Grade
                  </AppText>
                  <AppText variant="body" weight="extrabold" style={{ marginTop: 2, color: gradeMeta.color }}>
                    {gradeLetter} ({percent}%)
                  </AppText>
                </View>
              </View>
            </>
          ) : (
            <AppText variant="caption" tone="muted" style={{ paddingVertical: 12, textAlign: 'center' }}>
              No approved marks have been published yet.
            </AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}
