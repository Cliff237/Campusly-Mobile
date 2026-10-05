import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export default function TeacherScheduleScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const bottomOffset = useBottomTabOffset(36);
  const { accessToken, currentMembership } = useAuth();
  const { hasPermission } = usePermissions();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDay, setActiveDay] = useState<string>('Mon');

  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        setClasses(await fetchTeacherClasses(accessToken));
      } catch (error) {
        console.error('[Teacher schedule] load failed', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const totalStudents = useMemo(
    () => classes.reduce((sum, item) => sum + (item.enrolled_count || 0), 0),
    [classes],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: bottomOffset, flexGrow: 1 }}
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
      {/* Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <AppText variant="display" weight="extrabold">
          Teaching Schedule
        </AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: 4 }}>
          {currentMembership?.institution_name || 'Academic Term'} · Class timetables & exams
        </AppText>
      </View>

      {/* Term Stats Card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 22,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            elevation: 2,
            shadowColor: '#1B1730',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
          }}
        >
          <View>
            <AppText variant="caption" tone="muted">
              Active Courses
            </AppText>
            <AppText variant="heading" weight="extrabold" tone="brand" style={{ marginTop: 2 }}>
              {classes.length} classes
            </AppText>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: colors.border }} />
          <View>
            <AppText variant="caption" tone="muted">
              Total Enrolled
            </AppText>
            <AppText variant="heading" weight="extrabold" style={{ marginTop: 2 }}>
              {totalStudents} students
            </AppText>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: colors.border }} />
          <View>
            <AppText variant="caption" tone="muted">
              Term Status
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.success }} />
              <AppText variant="caption" weight="bold" style={{ color: colors.success }}>
                In Session
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {/* Weekday Filter Strip */}
      <View style={{ paddingHorizontal: 20, marginBottom: 18 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surfaceMuted,
            borderRadius: 16,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {DAYS.map((day) => {
            const active = activeDay === day;
            return (
              <TouchableOpacity
                key={day}
                onPress={() => {
                  haptics.selection();
                  setActiveDay(day);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: active ? colors.brand : 'transparent',
                }}
              >
                <AppText variant="caption" weight="bold" style={{ color: active ? '#FFFFFF' : colors.text }}>
                  {day}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Class Schedule Cards */}
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.brand} size="large" />
          <AppText variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading teaching timetable…
          </AppText>
        </View>
      ) : classes.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No scheduled classes"
          message="Your assigned courses and schedule will appear here."
        />
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {classes.map((item, index) => (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border,
                elevation: 2,
                shadowColor: '#1B1730',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
              }}
            >
              {/* Card Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    backgroundColor: colors.brandSoft,
                    borderWidth: 1.5,
                    borderColor: 'rgba(91, 63, 209, 0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText variant="heading" weight="extrabold" tone="brand">
                    {item.course_code.slice(0, 2).toUpperCase()}
                  </AppText>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="label" weight="extrabold" numberOfLines={1} style={{ flex: 1 }}>
                      {item.course_name}
                    </AppText>
                    <View
                      style={{
                        backgroundColor: colors.surfaceMuted,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                        marginLeft: 8,
                      }}
                    >
                      <AppText variant="caption" weight="bold" tone="muted">
                        Sec {item.section || '1'}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <AppText variant="caption" weight="semibold" tone="brand">
                      {item.course_code}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      ·
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                      <AppText variant="caption" tone="muted">
                        {item.enrolled_count} enrolled
                      </AppText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                {hasPermission('start_attendance') ? (
                  <TouchableOpacity
                    onPress={() => {
                      haptics.medium();
                      router.push(
                        `/teacher/attendance/configure?classId=${item.id}&courseId=${item.course_id}&courseName=${encodeURIComponent(
                          item.course_name,
                        )}` as any,
                      );
                    }}
                    style={{
                      flex: 1.2,
                      paddingVertical: 10,
                      borderRadius: 14,
                      backgroundColor: colors.brand,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="radio-outline" size={16} color="#FFFFFF" />
                    <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF' }}>
                      Take Attendance
                    </AppText>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    router.push('/teacher/marks');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <Ionicons name="create-outline" size={16} color={colors.text} />
                  <AppText variant="caption" weight="bold">
                    Gradebook
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
