import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchTeacherClasses } from '@/lib/api/teacherMarks';
import { fetchInstitutionMemberPosts, togglePostReaction } from '@/lib/api/student';
import { FeedPostCard } from '@/components/student/home/FeedPostCard';
import type { TeacherClass } from '@/lib/types/teacherMarks';
import type { StudentFeedPost } from '@/lib/types/student';

export default function TeacherHomeScreen() {
  const router = useRouter(); const { accessToken, currentMembership, user } = useAuth(); const { hasPermission } = usePermissions();
  const { colors, shadow, isDark } = useAppTheme();
  const [classes, setClasses] = useState<TeacherClass[]>([]); const [posts, setPosts] = useState<StudentFeedPost[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => { if (!accessToken || !currentMembership) return; refresh ? setRefreshing(true) : setLoading(true); try { const [result, institutionPosts] = await Promise.all([fetchTeacherClasses(accessToken), fetchInstitutionMemberPosts(currentMembership.institution_id, accessToken, { scope: 'institution_wide' })]); setClasses(result); setPosts(institutionPosts); console.log('[Teacher home] priorities refreshed', { classCount: result.length, postCount: institutionPosts.length, institutionId: currentMembership.institution_id }); } catch (error) { console.error('[Teacher home] loading failed', error); } finally { setLoading(false); setRefreshing(false); } }, [accessToken, currentMembership]);
  useEffect(() => { void load(); }, [load]);
  const first = classes[0];
  const surface = { backgroundColor: colors.surface, borderColor: colors.border } as const;

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}>
    {/* Greeting */}
    <AppText variant="display">Good day, {user?.full_name?.split(' ')[0] || 'Teacher'}</AppText>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, marginBottom: 18 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
      <AppText variant="caption" tone="muted" weight="medium">{currentMembership?.institution_name}</AppText>
    </View>

    {/* Today's priorities — hero gradient card */}
    <Animated.View entering={FadeInDown.duration(340)}>
      <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 26, padding: 18, marginBottom: 20, boxShadow: shadow.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <AppText variant="subheading" color="#FFFFFF">Today’s priorities</AppText>
          <Ionicons name="clipboard-outline" size={21} color="#CFC5FF" />
        </View>
        {loading ? <ActivityIndicator color="#ffffff" style={{ marginVertical: 24 }} /> : !first ? <AppText variant="caption" color="#CFC5FF" style={{ marginTop: 12 }}>No assigned classes yet.</AppText> : <>
          {hasPermission('start_attendance') ? <Priority icon="checkmark-circle-outline" title={`Run attendance · ${first.course_name}`} detail="Open session controls for your next class" color="#A7F3D0" action="Configure" onPress={() => router.push(`/teacher/attendance/configure?classId=${first.id}&courseId=${first.course_id}&courseName=${encodeURIComponent(first.course_name)}` as any)} /> : null}
          {hasPermission('view_grades') ? <Priority icon="create-outline" title={`Review marks · ${first.course_name}`} detail="Open class gradebook" color="#FDE68A" action="Review" onPress={() => router.push('/teacher/marks')} /> : null}
          <Priority icon="calendar-outline" title={`${classes.length} course${classes.length === 1 ? '' : 's'} this term`} detail="Review your teaching schedule" color="#CFC5FF" action="Schedule" onPress={() => router.push('/teacher/schedule')} />
        </>}
      </LinearGradient>
    </Animated.View>

    {/* Teaching overview */}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <AppText variant="subheading">Teaching overview</AppText>
      <View style={{ backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
        <AppText variant="caption" weight="bold" color={colors.brand} style={{ fontSize: 11.5, lineHeight: 14 }}>{classes.length} classes</AppText>
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <QuickCard icon="book" label="Courses" tint={colors.brand} onPress={() => router.push('/teacher/courses')} />
      <QuickCard icon="people" label="Roster" tint={colors.info} onPress={() => router.push('/teacher/roster')} />
      <QuickCard icon="stats-chart" label="Marks" tint={colors.warning} onPress={() => router.push('/teacher/marks')} />
    </View>

    {/* Institution feed */}
    <View style={{ marginTop: 28, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="subheading">Institution feed</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="newspaper-outline" size={16} color={colors.brand} />
          <AppText variant="caption" weight="bold" color={colors.brand} style={{ fontSize: 10.5, lineHeight: 13, letterSpacing: 0.8 }}>LATEST</AppText>
        </View>
      </View>
      <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>What’s happening across campus</AppText>
    </View>
    {posts.length ? posts.slice(0, 8).map((post, index) => <Animated.View key={post.id} entering={FadeInDown.duration(320).delay(Math.min(index, 5) * 55)}>
      <FeedPostCard post={post} canReact={hasPermission('react_to_posts')} canComment={hasPermission('comment_on_posts')} canManage={post.author_user_id === user?.id} onComment={() => undefined} onLike={async (item) => { if (!accessToken) return; const result = await togglePostReaction(item.id, accessToken); setPosts((items) => items.map((current) => current.id === item.id ? { ...current, ...result } : current)); }} onMediaPress={() => undefined} />
    </Animated.View>) : <View style={{ ...surface, borderWidth: 1, borderRadius: 22, padding: 20, alignItems: 'center' }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: isDark ? colors.surfaceMuted : colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name="newspaper-outline" size={22} color={colors.brand} />
      </View>
      <AppText weight="bold">No institution posts yet</AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 3, textAlign: 'center' }}>Announcements and events from your campus will appear here.</AppText>
    </View>}
  </ScrollView>;
}

function Priority({ icon, title, detail, action, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; action: string; color: string; onPress: () => void }) { return <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={18} color={color} /></View><View style={{ flex: 1, marginLeft: 11 }}><AppText variant="caption" weight="bold" color="#FFFFFF">{title}</AppText><AppText variant="caption" color="#CFC5FF" style={{ marginTop: 2 }}>{detail}</AppText></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={action} onPress={onPress} style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 13, paddingVertical: 7 }}><AppText variant="caption" weight="bold" color="#FFFFFF">{action}</AppText></TouchableOpacity></View>; }
function QuickCard({ icon, label, tint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void }) { const { colors, shadow, isDark } = useAppTheme(); return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingVertical: 16, alignItems: 'center', boxShadow: shadow.sm }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? colors.surfaceMuted : `${tint}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Ionicons name={icon} size={21} color={tint} /></View><AppText variant="caption" weight="bold">{label}</AppText></TouchableOpacity>; }
