import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { StatsCards } from '@/components/student/marks/StatsCards';
import { AbsenceList } from '@/components/student/marks/AbsenceList';
import { AchievementsRow } from '@/components/student/marks/AchievementsRow';
import { CourseGradeCard } from '@/components/student/marks/CourseGradeCard';
import { EmptyState } from '@/ui/EmptyState';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { useAppTheme } from '@/ui/useAppTheme';
import { useBottomTabOffset } from '@/ui/tabBarOptions';
import { createStudentReportCard, fetchStudentDashboard, type StudentDashboard } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { API_URL } from '@/lib/config';
import { haptics } from '@/lib/haptics';
import { showToast } from '@/ui/Toast';

export default function MarksScreen() {
  const { colors, isDark } = useAppTheme();
  const bottomOffset = useBottomTabOffset(28);
  const { accessToken, currentMembership } = useAuth();
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !currentMembership) return;
      setRefreshing(isRefresh);
      try {
        const data = await fetchStudentDashboard(currentMembership.institution_id, accessToken);
        setDashboard(data);
      } catch (error) {
        showToast.error('Marks', error instanceof Error ? error.message : 'Could not load marks');
      } finally {
        setRefreshing(false);
      }
    },
    [accessToken, currentMembership],
  );

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const overview = useMemo(() => {
    const grades = dashboard?.grades ?? [];
    const attendance = dashboard?.attendance ?? [];
    const scored = grades.filter((grade) => grade.total_percent != null);
    const average = scored.length
      ? Math.round(scored.reduce((sum, grade) => sum + (grade.total_percent ?? 0), 0) / scored.length)
      : null;
    const absences = attendance.filter((record) => record.status === 'absent').length;
    return { average, absences, completed: scored.length, courses: grades.length };
  }, [dashboard]);

  const download = async () => {
    if (!accessToken || !currentMembership) return;
    haptics.medium();
    setDownloading(true);
    try {
      const report = await createStudentReportCard(currentMembership.institution_id, accessToken);
      const targetUrl = report.url.startsWith('/') ? `${API_URL}${report.url}` : report.url;
      await Linking.openURL(targetUrl);
      haptics.success();
    } catch (error) {
      showToast.error('Report card unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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
      <PermissionGate
        permission="view_grades"
        fallback={
          <EmptyState
            icon="lock-closed-outline"
            title="Grades Protected"
            message="Your institution has not published grades for this semester yet or permission is restricted."
          />
        }
      >
        {/* ─── Hero Card ─── */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <LinearGradient
            colors={['#170F2E', '#311A6E', '#5B3FD1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              padding: 22,
              overflow: 'hidden',
              elevation: 4,
              shadowColor: '#43299F',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
            }}
          >
            {/* Background ambient orbs */}
            <View
              style={{
                position: 'absolute',
                right: -24,
                top: -24,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 60,
                bottom: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(91, 63, 209, 0.25)',
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                    alignSelf: 'flex-start',
                    marginBottom: 10,
                  }}
                >
                  <Ionicons name="sparkles" size={13} color="#FBBF24" />
                  <AppText variant="overline" weight="extrabold" style={{ color: '#FFFFFF', letterSpacing: 0.8 }}>
                    ACADEMIC STANDING
                  </AppText>
                </View>

                <AppText variant="display" weight="extrabold" style={{ color: '#FFFFFF' }}>
                  Marks & Results
                </AppText>
                <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.75)', marginTop: 4 }}>
                  Official grade transcripts, GPA progression, and attendance impact.
                </AppText>
              </View>

              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="stats-chart" size={24} color="#FBBF24" />
              </View>
            </View>

            {/* Quick Metrics */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  padding: 14,
                }}
              >
                <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Overall Average
                </AppText>
                <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', marginTop: 4 }}>
                  {overview.average == null ? '—' : `${overview.average}%`}
                </AppText>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  padding: 14,
                }}
              >
                <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Total Absences
                </AppText>
                <AppText
                  variant="heading"
                  weight="extrabold"
                  style={{
                    color: overview.absences > 0 ? '#FDA4AF' : '#86EFAC',
                    marginTop: 4,
                  }}
                >
                  {overview.absences}
                </AppText>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  padding: 14,
                }}
              >
                <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Graded
                </AppText>
                <AppText variant="heading" weight="extrabold" style={{ color: '#FFFFFF', marginTop: 4 }}>
                  {overview.completed}/{overview.courses}
                </AppText>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ─── Download Transcript Card ─── */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 20,
            borderRadius: 22,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 1,
            shadowColor: '#170F2E',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 6,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: colors.brandSoft,
              borderWidth: 1,
              borderColor: colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.brand} />
          </View>

          <View style={{ flex: 1, paddingRight: 12 }}>
            <AppText variant="caption" weight="bold">
              Official Report Card
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              Download PDF with all grades, deductions and attendance.
            </AppText>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Download academic report card"
            disabled={downloading}
            onPress={() => void download()}
            activeOpacity={0.8}
            style={{
              borderRadius: 14,
              backgroundColor: colors.brand,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF' }}>
                  PDF
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Stats Carousel ─── */}
        <StatsCards stats={dashboard?.stats ?? {}} />

        {/* ─── Course Performance Section Header ─── */}
        <View
          style={{
            paddingHorizontal: 20,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View>
            <AppText variant="subheading" weight="bold">
              Course Performance
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              Tap a course for assessment details and deductions
            </AppText>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: colors.brandSoft,
            }}
          >
            <AppText variant="caption" weight="bold" tone="brand">
              {overview.completed}/{overview.courses} published
            </AppText>
          </View>
        </View>

        {/* ─── Course Grade Cards ─── */}
        {(dashboard?.grades ?? []).map((grade) => (
          <CourseGradeCard key={grade.class_id} course={grade} />
        ))}

        {/* ─── Attendance Overview Banner ─── */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 20,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
            <AppText variant="subheading" weight="bold">
              Attendance & Penalty Summary
            </AppText>
          </View>
          <AppText variant="caption" tone="muted">
            {dashboard?.stats.attendance_percent ?? '—'}% overall attendance across verified sessions. Each unexcused absence
            applies a specific deduction to your final course score.
          </AppText>
        </View>

        {/* ─── Absence Log ─── */}
        <AbsenceList records={dashboard?.attendance ?? []} />

        {/* ─── Achievements ─── */}
        <AchievementsRow badges={dashboard?.badges ?? []} />

        {!dashboard && !refreshing ? (
          <EmptyState
            icon="bar-chart-outline"
            title="No Results Yet"
            message="Approved marks and verified attendance records will appear here as your teachers publish them."
          />
        ) : null}

        {refreshing && !dashboard ? <ActivityIndicator color={colors.brand} style={{ paddingVertical: 40 }} /> : null}
      </PermissionGate>
    </ScrollView>
  );
}
