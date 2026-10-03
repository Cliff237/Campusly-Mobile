import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

export default function TeacherDashboard() {
  const router = useRouter();
  const { accessToken, currentMembership } = useAuth();
  const { colors, shadow, isDark } = useAppTheme();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClasses = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await fetchTeacherClasses(accessToken);
      console.log('[Teacher dashboard] classes loaded', { count: result.length, institutionId: currentMembership?.institution_id });
      setClasses(result);
    } catch (error) {
      console.error('[Teacher dashboard] could not load classes', { error });
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, currentMembership?.institution_id]);

  useEffect(() => { void loadClasses(); }, [loadClasses]);

  // The dashboard is a role home screen, so Android back returns to the
  // campus picker rather than closing the app.
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)/discover');
      return true;
    });
    return () => subscription.remove();
  }, [router]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadClasses(true)} tintColor={colors.brand} />}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <AppText variant="display">Teaching space</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
              <AppText variant="caption" tone="muted" weight="medium">{currentMembership?.institution_name || 'Your institution'}</AppText>
            </View>
          </View>
          <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', boxShadow: shadow.sm }}>
            <Ionicons name="briefcase-outline" size={22} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* ── Teaching load — hero card ── */}
        <Animated.View entering={FadeInDown.duration(320)} style={{ borderRadius: 26, marginBottom: 24, overflow: 'hidden', boxShadow: shadow.md }}>
          <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
            <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)', right: -34, top: -30 }} />
            <AppText variant="caption" color="#CFC5FF" weight="bold" style={{ letterSpacing: 1.2 }}>YOUR TEACHING LOAD</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
              <AppText variant="display" color="#FFFFFF" style={{ fontSize: 44, lineHeight: 48 }}>{classes.length}</AppText>
              <AppText variant="caption" color="#CFC5FF" weight="semibold" style={{ marginLeft: 8, marginBottom: 7 }}>assigned class{classes.length === 1 ? '' : 'es'}</AppText>
            </View>
            <AppText variant="caption" color="#CFC5FF" style={{ marginTop: 8 }}>Open a class to take attendance or manage its marks.</AppText>
          </LinearGradient>
        </Animated.View>

        {/* ── My classes ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <AppText variant="subheading">My classes</AppText>
          <TouchableOpacity onPress={() => router.push('/teacher/marks')} accessibilityRole="button" accessibilityLabel="Manage all marks" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <AppText variant="caption" weight="bold" color={colors.brand}>Manage marks</AppText>
            <Ionicons name="arrow-forward" size={13} color={colors.brand} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingTop: 64, alignItems: 'center' }}><ActivityIndicator size="large" color={colors.brand} /></View>
        ) : classes.length === 0 ? (
          <EmptyState icon="book-outline" title="No assigned classes" message="Classes assigned to you will appear here." />
        ) : classes.map((item, index) => (
          <Animated.View key={item.id} entering={FadeInDown.duration(300).delay(Math.min(index, 6) * 45)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 16, marginBottom: 12, boxShadow: shadow.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="caption" weight="bold" color={colors.brand} style={{ fontSize: 12.5, lineHeight: 16 }}>{item.course_code.slice(0, 2).toUpperCase()}</AppText>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="subheading" style={{ fontSize: 16 }}>{item.course_name}</AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 3 }}>{item.course_code} · {item.section} · {item.enrolled_count} students</AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity onPress={() => router.push('/teacher/marks')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, borderRadius: 14, paddingVertical: 11 }} accessibilityRole="button" accessibilityLabel={`Manage marks for ${item.course_name}`}>
                <Ionicons name="stats-chart-outline" size={15} color={colors.brand} />
                <AppText variant="caption" weight="bold" color={colors.brand}>Marks</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/(student)/attendance/configure?classId=${encodeURIComponent(item.id)}&courseId=${encodeURIComponent(item.course_id)}&courseName=${encodeURIComponent(item.course_name)}` as any)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, overflow: 'hidden', boxShadow: shadow.sm }}
                accessibilityRole="button"
                accessibilityLabel={`Start attendance for ${item.course_name}`}
              >
                <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 }}>
                  <Ionicons name="radio-outline" size={15} color="#FFFFFF" />
                  <AppText variant="caption" weight="bold" color="#FFFFFF">Attendance</AppText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
