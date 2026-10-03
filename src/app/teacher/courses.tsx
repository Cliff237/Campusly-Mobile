import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

/** Stable per-course gradient so a channel keeps its colour between visits. */
function courseGradient(courseId: string): [string, string] {
  const palettes: [string, string][] = [
    ['#8B5CF6', '#6D28D9'],
    ['#60A5FA', '#2563B8'],
    ['#34D399', '#0F9F6E'],
    ['#FBBF24', '#D97706'],
    ['#FB7185', '#C8344F'],
    ['#38BDF8', '#0284C7'],
  ];
  let hash = 0;
  for (const char of courseId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palettes[hash % palettes.length];
}

/** Course channel list — same routes/actions, card design from the new system. */
export default function TeacherCoursesScreen() {
  const router = useRouter(); const { accessToken } = useAuth(); const { hasPermission } = usePermissions(); const { colors, shadow, isDark } = useAppTheme(); const [classes, setClasses] = useState<TeacherClass[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => { if (!accessToken) return; refresh ? setRefreshing(true) : setLoading(true); try { setClasses(await fetchTeacherClasses(accessToken)); } catch (error) { console.error('[Teacher courses] load failed', error); } finally { setLoading(false); setRefreshing(false); } }, [accessToken]); useEffect(() => { void load(); }, [load]);
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 36, flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}>
    <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
      <AppText variant="display">Courses</AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 3 }}>Your class channels and teaching updates</AppText>
      {classes.length > 0 && !loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
          <AppText variant="caption" weight="semibold" tone="muted">{classes.length} active channel{classes.length === 1 ? '' : 's'}</AppText>
        </View>
      ) : null}
    </View>
    {loading ? <ActivityIndicator color={colors.brand} style={{ paddingTop: 70 }} /> : !classes.length ? <EmptyState icon="book-outline" title="No assigned courses" message="Your teaching assignments will appear here." /> : classes.map((item, index) => <Animated.View key={item.id} entering={FadeInDown.duration(300).delay(Math.min(index, 6) * 45)} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <TouchableOpacity activeOpacity={0.82} onPress={() => router.push(`/teacher/courses/${item.course_id}?name=${encodeURIComponent(item.course_name)}&classId=${item.id}` as any)} accessibilityRole="button" accessibilityLabel={`Open ${item.course_name} course channel`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 14, boxShadow: shadow.sm }}>
        <LinearGradient colors={courseGradient(item.id)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="title" color="#FFFFFF">{item.course_code.slice(0, 1).toUpperCase()}</AppText>
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 13, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText weight="bold" numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>{item.course_name}</AppText>
            <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginLeft: 8 }}>
              <AppText variant="caption" weight="bold" color={colors.brand}>{item.section}</AppText>
            </View>
          </View>
          <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 4 }}>{item.course_code} · {item.enrolled_count} students · Course channel</AppText>
        </View>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isDark ? colors.surfaceMuted : colors.background, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>)}
    {hasPermission('start_attendance') && classes.length > 0 ? <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
      <Button
        title="Start attendance"
        variant="primary"
        size="lg"
        fullWidth
        leftIcon="checkmark-circle-outline"
        onPress={() => { const item = classes[0]; router.push(`/teacher/attendance/configure?classId=${item.id}&courseId=${item.course_id}&courseName=${encodeURIComponent(item.course_name)}` as any); }}
      />
    </View> : null}
  </ScrollView>;
}
