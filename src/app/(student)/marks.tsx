import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatsCards } from '@/components/student/marks/StatsCards';
import { AbsenceList } from '@/components/student/marks/AbsenceList';
import { AchievementsRow } from '@/components/student/marks/AchievementsRow';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { PermissionGate } from '@/components/student/shared/PermissionGate';
import { ThemedText } from '@/ui/ThemedText';
import { CourseGradeCard } from '@/components/student/marks/CourseGradeCard';
import { createStudentReportCard, fetchStudentDashboard, type StudentDashboard } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { API_URL } from '@/lib/config';
import { showToast } from '@/ui/Toast';

export default function MarksScreen() {
  const { accessToken, currentMembership } = useAuth();
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || !currentMembership) return;
    setRefreshing(isRefresh);
    try { setDashboard(await fetchStudentDashboard(currentMembership.institution_id, accessToken)); }
    catch (error) { showToast.error('Marks', error instanceof Error ? error.message : 'Could not load marks'); }
    finally { setRefreshing(false); }
  }, [accessToken, currentMembership]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);
  const overview = useMemo(() => {
    const grades = dashboard?.grades ?? []; const attendance = dashboard?.attendance ?? [];
    const scored = grades.filter((grade) => grade.total_percent != null);
    const average = scored.length ? Math.round(scored.reduce((sum, grade) => sum + (grade.total_percent ?? 0), 0) / scored.length) : null;
    const absences = attendance.filter((record) => record.status === 'absent').length;
    return { average, absences, completed: scored.length, courses: grades.length };
  }, [dashboard]);
  const download = async () => {
    if (!accessToken || !currentMembership) return;
    setDownloading(true);
    try {
      const report = await createStudentReportCard(currentMembership.institution_id, accessToken);
      await Linking.openURL(report.url.startsWith('/') ? `${API_URL}${report.url}` : report.url);
    } catch (error) { showToast.error('Report card unavailable', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setDownloading(false); }
  };
  return <ScrollView className="flex-1 bg-bg dark:bg-bg-dark" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#5b3fd1" />}>
    <PermissionGate permission="view_grades" fallback={<EmptyStateAnimation icon="lock-closed-outline" title="Grades hidden" subtitle="You do not have permission to view grades" />}>
      <View className="mx-5 mb-5 rounded-3xl bg-ink p-5 overflow-hidden">
        <View className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary/40" />
        <View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><ThemedText variant="tiny" className="text-violet-soft font-semibold tracking-wider">ACADEMIC PERFORMANCE</ThemedText><ThemedText variant="display" className="text-white mt-1">My marks</ThemedText><ThemedText variant="caption" className="text-white/70 mt-1">Approved results, attendance, and course insight.</ThemedText></View><View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center"><Ionicons name="stats-chart" size={24} color="#fbbf24" /></View></View>
        <View className="flex-row gap-2 mt-5"><View className="flex-1 rounded-2xl bg-white/10 p-3"><ThemedText variant="tiny" className="text-white/70">Overall average</ThemedText><ThemedText variant="heading" className="text-white mt-1">{overview.average == null ? '—' : `${overview.average}%`}</ThemedText></View><View className="flex-1 rounded-2xl bg-white/10 p-3"><ThemedText variant="tiny" className="text-white/70">Absences</ThemedText><ThemedText variant="heading" className="text-sun mt-1">{overview.absences}</ThemedText></View></View>
      </View>
      <View className="mx-5 mb-5 rounded-2xl bg-primary-soft border border-primary/20 p-4 flex-row items-center"><View className="w-10 h-10 rounded-xl bg-primary items-center justify-center"><Ionicons name="document-text-outline" size={20} color="#fff" /></View><View className="flex-1 ml-3"><ThemedText variant="caption" className="font-bold">Academic report card</ThemedText><ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">Your marks, attendance, and absence details in one PDF.</ThemedText></View><TouchableOpacity disabled={downloading} onPress={() => void download()} className="rounded-xl bg-primary px-3 py-2"><ThemedText variant="tiny" className="text-white font-bold">{downloading ? 'Preparing…' : 'Download'}</ThemedText></TouchableOpacity></View>
      <StatsCards stats={dashboard?.stats ?? {}} />
      <View className="px-5 mb-3 flex-row justify-between items-end"><View><ThemedText variant="subheading">Course performance</ThemedText><ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">Open a course for assessments, deductions, and attendance impact.</ThemedText></View><ThemedText variant="tiny" className="text-primary font-semibold">{overview.completed}/{overview.courses}</ThemedText></View>
      {(dashboard?.grades ?? []).map((grade) => <CourseGradeCard key={grade.class_id} course={grade} />)}
      <View className="mx-5 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4 mb-5"><ThemedText variant="subheading">Attendance overview</ThemedText><ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1">{dashboard?.stats.attendance_percent ?? '—'}% attendance across all closed class sessions. Each course card shows its absence count and related mark deductions.</ThemedText></View>
      <AbsenceList records={dashboard?.attendance ?? []} />
      <AchievementsRow badges={dashboard?.badges ?? []} />
      {!dashboard && !refreshing ? <EmptyStateAnimation icon="bar-chart-outline" title="No results yet" subtitle="Approved marks and closed attendance sessions will appear here." /> : null}
      {refreshing && !dashboard ? <ActivityIndicator color="#5b3fd1" className="py-10" /> : null}
    </PermissionGate>
  </ScrollView>;
}
