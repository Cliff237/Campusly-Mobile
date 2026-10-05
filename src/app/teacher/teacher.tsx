import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { BrandMark } from '@/ui/brand/BrandMark';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

export default function TeacherDashboard() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const bottomOffset = useBottomTabOffset(36);
  const { accessToken, currentMembership } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClasses = useCallback(
    async (refresh = false) => {
      if (!accessToken) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const result = await fetchTeacherClasses(accessToken);
        setClasses(result);
      } catch (error) {
        console.error('[Teacher dashboard] could not load classes', { error });
        setClasses([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/(tabs)/discover');
        return true;
      });
      return () => subscription.remove();
    }, [router]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: bottomOffset }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadClasses(true)}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <AppText variant="display" weight="extrabold">
              Teaching Workspace
            </AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
              {currentMembership?.institution_name || 'Your institution'}
            </AppText>
          </View>
          <BrandMark size={44} variant="solid" />
        </View>

        {/* Load Overview Banner */}
        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: '#1E143E',
            marginBottom: 24,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            elevation: 4,
            shadowColor: '#43299F',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
          }}
        >
          <LinearGradient
            colors={['#1D1242', '#351B78', '#5B3FD1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <AppText variant="overline" weight="extrabold" style={{ color: '#D1C6FF', letterSpacing: 1.2 }}>
              ASSIGNED WORKLOAD
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <AppText variant="display" weight="extrabold" style={{ color: '#FFFFFF', fontSize: 32 }}>
                {classes.length}
              </AppText>
              <AppText variant="caption" style={{ color: '#DDD5FF' }}>
                course classes this term
              </AppText>
            </View>
            <AppText variant="caption" style={{ color: '#DDD5FF', marginTop: 8 }}>
              Select any class below to start live Bluetooth attendance or manage student grade assessments.
            </AppText>
          </LinearGradient>
        </View>

        {/* Classes List Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <AppText variant="subheading" weight="bold">
            Assigned Classes
          </AppText>
          <TouchableOpacity onPress={() => router.push('/teacher/marks')}>
            <AppText variant="caption" weight="bold" tone="brand">
              Manage all marks
            </AppText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.brand} size="large" />
            <AppText variant="caption" tone="muted" style={{ marginTop: 12 }}>
              Loading courses…
            </AppText>
          </View>
        ) : classes.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No assigned classes"
            message="Classes assigned to your teaching profile will appear here."
          />
        ) : (
          <View style={{ gap: 14 }}>
            {classes.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 22,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  elevation: 2,
                  shadowColor: '#1B1730',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: colors.brandSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="heading" weight="extrabold" tone="brand">
                      {item.course_code.slice(0, 2).toUpperCase()}
                    </AppText>
                  </View>

                  <View style={{ flex: 1 }}>
                    <AppText variant="label" weight="extrabold" numberOfLines={1}>
                      {item.course_name}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                      {item.course_code} · Sec {item.section} · {item.enrolled_count} students
                    </AppText>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
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
                    }}
                  >
                    <AppText variant="caption" weight="bold">
                      Marks
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      haptics.medium();
                      router.push(
                        `/teacher/attendance/configure?classId=${encodeURIComponent(
                          item.id,
                        )}&courseId=${encodeURIComponent(item.course_id)}&courseName=${encodeURIComponent(
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
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
