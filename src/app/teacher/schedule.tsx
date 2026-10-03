import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Sheet } from '@/ui/Sheet';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { haptics } from '@/lib/haptics';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import type { TeacherClass } from '@/lib/types/teacherMarks';

export default function TeacherScheduleScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { colors, shadow, isDark } = useAppTheme();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // One dropdown instead of a stack of cards — the page shows a single class
  // at a time, so there is far less to scroll.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const load = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try { setClasses(await fetchTeacherClasses(accessToken)); }
    catch (error) { console.error('[Teacher schedule] load failed', error); }
    finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);
  useEffect(() => { void load(); }, [load]);
  const active = classes[Math.min(selectedIndex, Math.max(classes.length - 1, 0))];
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}>
    <AppText variant="display">Schedule</AppText>
    <AppText variant="caption" tone="muted" style={{ marginTop: 4, marginBottom: 18 }}>Select a class and course to create exams, enter marks, and view results.</AppText>
    {loading ? <ActivityIndicator color={colors.brand} style={{ paddingTop: 70 }} /> : !classes.length ? <EmptyState icon="calendar-outline" title="No assigned classes" message="Your assigned classes will appear here." /> : <>
      {/* ── Class dropdown trigger ── */}
      <AppText variant="overline" tone="muted" style={{ marginBottom: 8 }}>CLASS</AppText>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Selected class ${active.course_name}. Tap to change.`}
        onPress={() => { haptics.light(); setPickerOpen(true); }}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, boxShadow: shadow.sm }}
      >
        <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="calendar" size={19} color="#FFFFFF" />
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText weight="bold" numberOfLines={1}>{active.course_name}</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>{active.course_code} · {active.section}</AppText>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ── Selected class summary ── */}
      <Animated.View key={active.id} entering={FadeInDown.duration(280)} style={{ marginTop: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 18, boxShadow: shadow.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
            <AppText variant="caption" weight="bold" tone="muted" style={{ letterSpacing: 0.8 }}>ASSIGNED CLASS</AppText>
          </View>
          <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <AppText variant="caption" weight="bold" color={colors.brand} style={{ fontSize: 11.5, lineHeight: 14 }}>{active.enrolled_count} students</AppText>
          </View>
        </View>
        <AppText variant="subheading" style={{ marginTop: 12 }}>{active.course_name}</AppText>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
            <AppText variant="caption" weight="semibold" tone="muted">{active.course_code}</AppText>
          </View>
          <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
            <AppText variant="caption" weight="semibold" tone="muted">Section {active.section}</AppText>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 16, marginBottom: 14 }} />
        <Button title="Manage exams & marks" variant="primary" size="md" fullWidth leftIcon="create-outline" onPress={() => router.push('/teacher/marks')} />
      </Animated.View>
    </>}

    {/* ── Class picker sheet ── */}
    <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Select a class" scroll>
      {classes.map((item, index) => {
        const selected = index === Math.min(selectedIndex, classes.length - 1);
        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => { setSelectedIndex(index); setPickerOpen(false); }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 16, marginBottom: 8, backgroundColor: selected ? (isDark ? colors.surfaceMuted : colors.brandSoft) : colors.background, borderWidth: 1, borderColor: selected ? colors.brand : colors.border }}
          >
            <View style={{ flex: 1 }}>
              <AppText weight={selected ? 'bold' : 'semibold'} numberOfLines={1}>{item.course_name}</AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>{item.course_code} · {item.section} · {item.enrolled_count} students</AppText>
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.brand} /> : <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />}
          </TouchableOpacity>
        );
      })}
    </Sheet>
  </ScrollView>;
}
