import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { SearchField } from '@/ui/SearchField';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

export default function TeacherCoursesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        setClasses(await fetchTeacherClasses(accessToken));
      } catch (error) {
        console.error('[Teacher courses] load failed', error);
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

  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes;
    const q = search.trim().toLowerCase();
    return classes.filter(
      (c) => c.course_name.toLowerCase().includes(q) || c.course_code.toLowerCase().includes(q),
    );
  }, [classes, search]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 48, flexGrow: 1 }}
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
      {/* Screen Title & Subtitle */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <AppText variant="display" weight="extrabold">
          Courses
        </AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: 4 }}>
          Your active teaching class channels and student rosters
        </AppText>
      </View>

      {/* Search Field */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <SearchField
          placeholder="Search by course code or name..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Courses List */}
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.brand} size="large" />
          <AppText variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading teaching channels…
          </AppText>
        </View>
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No assigned courses"
          message={search ? `No classes match "${search}"` : 'Your teaching assignments will appear here.'}
        />
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {filteredClasses.map((item) => (
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
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  haptics.light();
                  router.push(
                    `/teacher/courses/${item.course_id}?name=${encodeURIComponent(item.course_name)}&classId=${item.id}` as any,
                  );
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
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

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <AppText variant="caption" weight="semibold" tone="brand">
                      {item.course_code}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      ·
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                      <AppText variant="caption" tone="muted">
                        {item.enrolled_count} students
                      </AppText>
                    </View>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
              </TouchableOpacity>

              {/* Action Buttons Row */}
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
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    router.push(
                      `/teacher/courses/${item.course_id}?name=${encodeURIComponent(item.course_name)}&classId=${item.id}` as any,
                    );
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
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
                  <AppText variant="caption" weight="bold">
                    Class Feed
                  </AppText>
                </TouchableOpacity>

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
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
