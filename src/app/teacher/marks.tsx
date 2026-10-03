import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { Sheet } from '@/ui/Sheet';
import { useAppTheme } from '@/ui/useAppTheme';
import { showToast } from '@/ui/Toast';
import { useModalPresence } from '@/ui/modalStore';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { createMarkSubmission, deleteMarkSubmission, fetchClassMarkSubmissions, fetchTeacherClasses, updateMarkSubmission } from '@/lib/api/teacherMarks';
import { fetchAttendanceRoster, fetchAttendanceSessions } from '@/lib/api/attendance';
import { createAssessmentType, deleteAssessmentType, fetchAssessmentTypes } from '@/lib/api/assessmentTypes';
import type { MarkAssessmentType, TeacherClass, TeacherMarkSubmission, CustomAssessmentType } from '@/lib/types/teacherMarks';
import type { AttendanceRosterStudent, AttendanceSessionSummary } from '@/lib/types/attendance';

const DEFAULT_TYPES: MarkAssessmentType[] = ['quiz', 'assignment', 'project', 'exam'];
const TYPE_LABELS: Record<string, string> = { quiz: 'Quiz', assignment: 'Assignment', project: 'Project', exam: 'Exam' };
const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = { quiz: 'document-text-outline', assignment: 'clipboard-outline', project: 'folder-outline', exam: 'school-outline' };
const STATUS_COLORS: Record<string, string> = { pending_approval: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

const percent = (score: number, max: number) => max ? Math.round((score / max) * 100) : 0;

const getTypeLabel = (type: string, customTypes: CustomAssessmentType[]) => {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  const custom = customTypes.find(t => t.name === type);
  return custom?.name || type;
};

const getTypeIcon = (type: string, customTypes: CustomAssessmentType[]): keyof typeof Ionicons.glyphMap => {
  if (TYPE_ICONS[type]) return TYPE_ICONS[type];
  const custom = customTypes.find(t => t.name === type);
  return (custom?.icon as keyof typeof Ionicons.glyphMap) || 'document-outline';
};

export default function TeacherMarksScreen() {
  const { accessToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { colors, shadow } = useAppTheme();
  const isDarkSoft = colorScheme === 'dark' ? colors.surfaceMuted : colors.brandSoft;
  
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selected, setSelected] = useState<TeacherClass | null>(null);
  const [submissions, setSubmissions] = useState<TeacherMarkSubmission[]>([]);
  const [customTypes, setCustomTypes] = useState<CustomAssessmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composer, setComposer] = useState(false);
  const [editing, setEditing] = useState<TeacherMarkSubmission | null>(null);
  const [viewDetail, setViewDetail] = useState<TeacherMarkSubmission | null>(null);
  const [typeManager, setTypeManager] = useState(false);
  const [filterType, setFilterType] = useState<MarkAssessmentType | 'all'>('all');
  // One dropdown instead of a horizontal class strip — fewer items on screen.
  const [pickerOpen, setPickerOpen] = useState(false);
  useModalPresence(composer || editing != null || viewDetail != null || typeManager || pickerOpen);

  const load = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    setRefreshing(refresh);
    try {
      const classList = await fetchTeacherClasses(accessToken);
      setClasses(classList);
      const target = selected && classList.some((item) => item.id === selected.id) ? selected : classList[0] ?? null;
      setSelected(target);
      setSubmissions(target ? await fetchClassMarkSubmissions(target.id, accessToken) : []);

      // Load custom assessment types if we have a selected class
      if (target) {
        try {
          const types = await fetchAssessmentTypes(target.institution_id, accessToken);
          setCustomTypes(types);
        } catch (error) {
          console.error('[Marks] Failed to load custom assessment types:', error);
          setCustomTypes([]);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load marks';
      console.error('[Marks] Load failed', { message, error });
      showToast.error('Marks unavailable', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, selected]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const choose = async (course: TeacherClass) => {
    if (!accessToken) return;
    setSelected(course);
    try {
      setSubmissions(await fetchClassMarkSubmissions(course.id, accessToken));
    } catch (error) {
      showToast.error('Could not load course marks', error instanceof Error ? error.message : 'Try again');
    }
  };

  const removeAssessment = (submission: TeacherMarkSubmission) => {
    if (!accessToken) return;
    Alert.alert('Delete assessment?', 'This removes its recorded marks. Approved assessments cannot be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        void deleteMarkSubmission(submission.id, accessToken).then(() => load(true)).catch((error: Error) => showToast.error('Could not delete assessment', error.message));
      }}
    ]);
  };

  const filteredSubmissions = filterType === 'all'
    ? submissions
    : submissions.filter(s => s.assessment_type === filterType);

  const allTypes = [...DEFAULT_TYPES, ...customTypes.map(t => t.name)];

  const calculateStats = () => {
    if (!submissions.length) return null;
    const totalStudents = selected?.enrolled_count || 0;
    const totalAssessments = submissions.length;
    const allEntries = submissions.flatMap(s => s.entries.map(e => ({ ...e, max_score: s.max_score })));
    const gradedCount = allEntries.length;
    const classAverage = gradedCount > 0 
      ? Math.round(allEntries.reduce((sum, entry) => sum + percent(entry.final_score, entry.max_score || 100), 0) / gradedCount)
      : 0;
    const approvedCount = submissions.filter(s => s.status === 'approved').length;
    const pendingCount = submissions.filter(s => s.status === 'pending_approval').length;

    return { totalStudents, totalAssessments, classAverage, approvedCount, pendingCount };
  };

  const stats = calculateStats();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
    >
      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <AppText variant="display">Marks</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>Manage assessments and student grades</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Manage assessment types"
            onPress={() => setTypeManager(true)}
            style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', boxShadow: shadow.sm }}
          >
            <Ionicons name="options-outline" size={21} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create mark submission"
            onPress={() => setComposer(true)}
            style={{ width: 46, height: 46, borderRadius: 16, overflow: 'hidden', boxShadow: shadow.brand ?? shadow.md }}
          >
            <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={25} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Class dropdown ── */}
      {classes.length ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Selected class ${selected?.course_name ?? ''}. Tap to change class.`}
          onPress={() => { haptics.light(); setPickerOpen(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, marginBottom: 16, boxShadow: shadow.sm }}
        >
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isDarkSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="school" size={19} color={colors.brand} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText weight="bold" numberOfLines={1}>{selected?.course_name ?? 'Select a class'}</AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {selected ? `${selected.course_code} · Section ${selected.section} · ${selected.enrolled_count} students` : 'Tap to browse your classes'}
            </AppText>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      {/* ── Statistics ── */}
      {stats && (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
          <StatTile label="Class Avg" value={`${stats.classAverage}%`} tint={colors.brand} accent={isDarkSoft} />
          <StatTile label="Assessments" value={String(stats.totalAssessments)} tint={colors.text} accent={isDarkSoft} />
          <StatTile label="Students" value={String(stats.totalStudents)} tint={colors.danger} accent={isDarkSoft} />
        </View>
      )}

      {/* ── Type filter ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 999, backgroundColor: filterType === 'all' ? colors.brand : colors.surface, borderWidth: 1, borderColor: filterType === 'all' ? colors.brand : colors.border }}
        >
          <AppText variant="caption" weight="bold" color={filterType === 'all' ? '#FFFFFF' : colors.textMuted}>All</AppText>
        </TouchableOpacity>
        {allTypes.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setFilterType(type)}
            style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 999, backgroundColor: filterType === type ? colors.brand : colors.surface, borderWidth: 1, borderColor: filterType === type ? colors.brand : colors.border }}
          >
            <AppText variant="caption" weight="bold" color={filterType === type ? '#FFFFFF' : colors.textMuted}>{getTypeLabel(type, customTypes)}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Loading / empty / list ── */}
      {loading ? (
        <View style={{ paddingTop: 70, alignItems: 'center' }}>
          <ActivityIndicator color={colors.brand} size="large" />
          <AppText variant="caption" tone="muted" style={{ marginTop: 10 }}>Loading marks...</AppText>
        </View>
      ) : !selected ? (
        <EmptyState icon="book-outline" title="No assigned courses" message="Your assigned course sections will appear here." />
      ) : filteredSubmissions.length ? (
        filteredSubmissions.map((submission, index) => {
          const graded = submission.entries.length;
          const average = graded
            ? Math.round(submission.entries.reduce((sum, entry) => sum + percent(entry.final_score, submission.max_score), 0) / graded)
            : 0;
          const statusColor = STATUS_COLORS[submission.status] || '#64748b';
          const isExam = submission.assessment_type === 'exam';

          return (
            <Animated.View key={submission.id} entering={FadeInDown.duration(280).delay(Math.min(index, 6) * 45)}>
              <TouchableOpacity
                onPress={() => setViewDetail(submission)}
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 16, marginBottom: 12, boxShadow: shadow.sm }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: isExam ? (dark ? colors.surfaceMuted : '#FDECEF') : isDarkSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={getTypeIcon(submission.assessment_type, customTypes)} size={22} color={isExam ? colors.danger : colors.brand} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 13 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                      <AppText weight="bold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 15.5 }}>{submission.assessment_name}</AppText>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: `${statusColor}1F` }}>
                        <AppText variant="caption" weight="bold" style={{ color: statusColor, fontSize: 10, lineHeight: 13, textTransform: 'uppercase' }}>
                          {submission.status.replace('_', ' ')}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 3 }}>
                      {getTypeLabel(submission.assessment_type, customTypes)} · Max: {submission.max_score}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <AppText variant="heading" color={colors.brand} style={{ fontSize: 21, lineHeight: 26 }}>{average}%</AppText>
                    <AppText variant="caption" tone="muted" style={{ fontSize: 11, lineHeight: 14 }}>avg</AppText>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="people-outline" size={15} color={colors.textMuted} />
                      <AppText variant="caption" tone="muted">{graded}/{selected.enrolled_count} graded</AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                      <AppText variant="caption" tone="muted">{new Date(submission.created_at).toLocaleDateString()}</AppText>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {submission.status === 'pending_approval' && (
                      <TouchableOpacity
                        onPress={() => setEditing(submission)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${submission.assessment_name}`}
                        style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: isDarkSoft, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="create-outline" size={17} color={colors.brand} />
                      </TouchableOpacity>
                    )}
                    {submission.status !== 'approved' && (
                      <TouchableOpacity
                        onPress={() => removeAssessment(submission)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${submission.assessment_name}`}
                        style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: dark ? colors.surfaceMuted : '#FDECEF', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="trash-outline" size={17} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })
      ) : (
        <EmptyState
          icon="ribbon-outline"
          title="No mark submissions"
          message={`No ${filterType === 'all' ? '' : TYPE_LABELS[filterType as MarkAssessmentType] + ' '}assessments found for this class.`}
        />
      )}

      {/* ── Class picker sheet ── */}
      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Select a class" scroll>
        {classes.map((item) => {
          const isSelected = selected?.id === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => { setPickerOpen(false); void choose(item); }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 16, marginBottom: 8, backgroundColor: isSelected ? (dark ? colors.surfaceMuted : colors.brandSoft) : colors.background, borderWidth: 1, borderColor: isSelected ? colors.brand : colors.border }}
            >
              <View style={{ flex: 1 }}>
                <AppText weight={isSelected ? 'bold' : 'semibold'} numberOfLines={1}>{item.course_name}</AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>{item.course_code} · {item.section} · {item.enrolled_count} students</AppText>
              </View>
              {isSelected ? <Ionicons name="checkmark-circle" size={20} color={colors.brand} /> : <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />}
            </TouchableOpacity>
          );
        })}
      </Sheet>

      {/* Compose Modal */}
      <GradeComposer
        visible={composer}
        course={selected}
        accessToken={accessToken}
        onClose={() => setComposer(false)}
        onCreated={() => void load(true)}
        customTypes={customTypes}
      />

      {/* Edit Modal */}
      <EditComposer
        visible={!!editing}
        submission={editing}
        accessToken={accessToken}
        onClose={() => setEditing(null)}
        onUpdated={() => void load(true)}
        customTypes={customTypes}
      />

      {/* Detail Modal */}
      <AssessmentDetail
        visible={!!viewDetail}
        submission={viewDetail}
        accessToken={accessToken}
        onClose={() => setViewDetail(null)}
        onUpdated={() => void load(true)}
        customTypes={customTypes}
      />

      {/* Assessment Type Manager Modal */}
      <AssessmentTypeManager
        visible={typeManager}
        institutionId={selected?.institution_id}
        customTypes={customTypes}
        accessToken={accessToken}
        onClose={() => setTypeManager(false)}
        onUpdated={() => void load(true)}
      />
    </ScrollView>
  );
}

/** Compact statistic tile used in the overview row. */
function StatTile({ label, value, tint, accent }: { label: string; value: string; tint: string; accent: string }) {
  const { colors, shadow } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 13, boxShadow: shadow.sm }}>
      <AppText variant="caption" tone="muted" style={{ fontSize: 11, lineHeight: 14 }}>{label}</AppText>
      <AppText variant="heading" color={tint} style={{ marginTop: 4, fontSize: 20, lineHeight: 25 }}>{value}</AppText>
      <View style={{ height: 3, width: 26, borderRadius: 2, backgroundColor: accent, marginTop: 8 }} />
    </View>
  );
}

function GradeComposer({ visible, course, accessToken, onClose, onCreated, customTypes }: {
  visible: boolean;
  course: TeacherClass | null;
  accessToken: string | null;
  onClose: () => void;
  onCreated: () => void;
  customTypes: CustomAssessmentType[];
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MarkAssessmentType>('quiz');
  const [maxScore, setMaxScore] = useState('20');
  const [roster, setRoster] = useState<AttendanceRosterStudent[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionSummary[]>([]);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | undefined>();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const allTypes = [...DEFAULT_TYPES, ...customTypes.map(t => t.name)];

  useEffect(() => {
    if (!visible || !course || !accessToken) return;
    const task = setTimeout(() => {
      setLoading(true);
      void Promise.all([
        fetchAttendanceRoster(course.id, accessToken),
        fetchAttendanceSessions(course.id, accessToken)
      ]).then(([students, attendance]) => {
        setRoster(students);
        setSessions(attendance);
        setAttendanceSessionId(attendance[0]?.id);
      }).catch((error: Error) => {
        showToast.error('Could not load class data', error.message);
      }).finally(() => {
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(task);
  }, [visible, course, accessToken]);

  const save = async () => {
    const max = Number(maxScore);
    if (!course || !accessToken || !title.trim() || !Number.isFinite(max) || max <= 0) {
      showToast.error('Check assessment details', 'Add a title and a valid maximum score.');
      return;
    }
    if (type === 'exam' && !attendanceSessionId) {
      showToast.error('Select attendance', 'Link the attendance session used for this exam.');
      return;
    }
    const entries = roster.flatMap((student) => {
      const raw = scores[student.membership_id]?.trim();
      return raw === '' || raw == null ? [] : [{ 
        student_membership_id: student.membership_id, 
        raw_score: Number(raw),
        deduction: 0,
        deduction_reason: undefined
      }];
    });
    if (entries.some((entry) => !Number.isFinite(entry.raw_score) || entry.raw_score < 0 || entry.raw_score > max)) {
      showToast.error('Check scores', `Scores must be between 0 and ${max}.`);
      return;
    }
    setSaving(true);
    try {
      await createMarkSubmission({
        class_id: course.id,
        assessment_name: title.trim(),
        assessment_type: type,
        max_score: max,
        attendance_session_id: type === 'exam' ? attendanceSessionId : undefined,
        entries
      }, accessToken);
      showToast.success('Marks saved', `${entries.length} student mark${entries.length === 1 ? '' : 's'} recorded.`);
      onClose();
      onCreated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save marks';
      showToast.error('Marks not saved', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-mist dark:bg-bg-dark">
        <View className="px-5 pt-16 pb-4 bg-surface dark:bg-surface-dark flex-row items-center border-b border-border dark:border-border-dark">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <ThemedText variant="heading">Enter marks</ThemedText>
            <ThemedText variant="tiny">
              {course ? `${course.course_code} · ${course.section}` : 'Select a course first'}
            </ThemedText>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          {/* Assessment Title */}
          <View className="mb-4">
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Assessment Title</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. CA 1, Midterm Exam"
              placeholderTextColor="#64748b"
              className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-4 py-4 text-text dark:text-text-dark"
            />
          </View>

          {/* Assessment Type */}
          <View className="mb-4">
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Assessment Type</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View className="flex-row gap-2">
                {allTypes.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setType(item)}
                    className={`flex-1 rounded-xl px-3 py-3 border-2 ${
                      type === item ? 'bg-ocean border-ocean' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                    }`}
                  >
                    <ThemedText variant="caption" className={type === item ? 'text-white font-bold text-center' : 'text-center'}>
                      {getTypeLabel(item, customTypes)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Maximum Score */}
          <View className="mb-4">
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Maximum Score</ThemedText>
            <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4">
              <TextInput
                value={maxScore}
                onChangeText={setMaxScore}
                keyboardType="decimal-pad"
                className="text-text dark:text-text-dark text-3xl font-bold"
              />
            </View>
          </View>

          {/* Attendance Session (for exams) */}
          {type === 'exam' && (
            <View className="mb-4">
              <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Link Attendance Session</ThemedText>
              <View className="flex-row gap-2">
                {sessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    onPress={() => setAttendanceSessionId(session.id)}
                    className={`flex-1 rounded-xl px-3 py-3 border-2 ${
                      attendanceSessionId === session.id ? 'bg-ocean border-ocean' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                    }`}
                  >
                    <ThemedText variant="tiny" className={attendanceSessionId === session.id ? 'text-white font-bold text-center' : 'text-center'}>
                      {session.period || 'Session'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Student Scores */}
          <View className="mt-6">
            <ThemedText variant="subheading" className="mb-3">Student Scores</ThemedText>
            {loading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#0f766e" />
              </View>
            ) : (
              <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark overflow-hidden">
                {roster.map((student) => (
                  <View
                    key={student.membership_id}
                    className="py-4 px-4 flex-row items-center border-b border-border dark:border-border-dark last:border-b-0"
                  >
                    <View className="w-8 h-8 rounded-full bg-ocean-soft items-center justify-center mr-3">
                      <ThemedText variant="tiny" className="text-ocean font-bold">
                        {student.full_name.charAt(0)}
                      </ThemedText>
                    </View>
                    <ThemedText variant="body" className="flex-1">
                      {student.full_name}
                    </ThemedText>
                    <TextInput
                      value={scores[student.membership_id] || ''}
                      onChangeText={(text) => setScores(prev => ({ ...prev, [student.membership_id]: text }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#64748b"
                      className="w-20 rounded-xl bg-mist dark:bg-bg-dark border border-border dark:border-border-dark px-3 py-2 text-center text-text dark:text-text-dark"
                    />
                    <ThemedText variant="tiny" className="ml-2 text-text-muted dark:text-text-muted-dark">/{maxScore}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            disabled={saving}
            onPress={() => void save()}
            className={`mt-6 rounded-2xl py-4 items-center ${saving ? 'bg-ocean/50' : 'bg-ocean'}`}
          >
            <ThemedText variant="body" className="text-white font-semibold">
              {saving ? 'Saving...' : 'Save Marks'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function EditComposer({ visible, submission, accessToken, onClose, onUpdated, customTypes }: {
  visible: boolean;
  submission: TeacherMarkSubmission | null;
  accessToken: string | null;
  onClose: () => void;
  onUpdated: () => void;
  customTypes: CustomAssessmentType[];
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MarkAssessmentType>('quiz');
  const [maxScore, setMaxScore] = useState('20');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const allTypes = [...DEFAULT_TYPES, ...customTypes.map(t => t.name)];
  const getTypeLabel = (type: string, customTypes: CustomAssessmentType[]) => {
    if (TYPE_LABELS[type]) return TYPE_LABELS[type];
    const custom = customTypes.find(t => t.name === type);
    return custom?.name || type;
  };

  useEffect(() => {
    if (submission) {
      setTitle(submission.assessment_name);
      setType(submission.assessment_type);
      setMaxScore(submission.max_score.toString());
      const scoreMap: Record<string, string> = {};
      submission.entries.forEach(entry => {
        scoreMap[entry.student_membership_id] = entry.raw_score.toString();
      });
      setScores(scoreMap);
    }
  }, [submission]);

  const save = async () => {
    if (!submission || !accessToken) return;
    const max = Number(maxScore);
    if (!title.trim() || !Number.isFinite(max) || max <= 0) {
      showToast.error('Check assessment details', 'Add a title and a valid maximum score.');
      return;
    }
    const entries = submission.entries.map(entry => ({
      student_membership_id: entry.student_membership_id,
      raw_score: Number(scores[entry.student_membership_id] || entry.raw_score),
      deduction: entry.deduction,
      deduction_reason: entry.deduction_reason || undefined
    }));
    if (entries.some((entry) => !Number.isFinite(entry.raw_score) || entry.raw_score < 0 || entry.raw_score > max)) {
      showToast.error('Check scores', `Scores must be between 0 and ${max}.`);
      return;
    }
    setSaving(true);
    try {
      await updateMarkSubmission(submission.id, {
        assessment_name: title.trim(),
        assessment_type: type,
        max_score: max,
        entries
      }, accessToken);
      showToast.success('Marks updated', 'Assessment has been updated successfully.');
      onClose();
      onUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update marks';
      showToast.error('Update failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-mist dark:bg-bg-dark">
        <View className="px-5 pt-16 pb-4 bg-surface dark:bg-surface-dark flex-row items-center border-b border-border dark:border-border-dark">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <ThemedText variant="heading">Edit Assessment</ThemedText>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <View className="mb-4">
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Assessment Title</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-4 py-4 text-text dark:text-text-dark"
            />
          </View>

          <View className="mb-4">
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Assessment Type</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View className="flex-row gap-2">
                {allTypes.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setType(item)}
                    className={`flex-1 rounded-xl px-3 py-3 border-2 ${
                      type === item ? 'bg-ocean border-ocean' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                    }`}
                  >
                    <ThemedText variant="caption" className={type === item ? 'text-white font-bold text-center' : 'text-center'}>
                      {getTypeLabel(item, customTypes)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="mb-4">
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Maximum Score</ThemedText>
            <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4">
              <TextInput
                value={maxScore}
                onChangeText={setMaxScore}
                keyboardType="decimal-pad"
                className="text-text dark:text-text-dark text-3xl font-bold"
              />
            </View>
          </View>

          <View className="mt-6">
            <ThemedText variant="subheading" className="mb-3">Student Scores</ThemedText>
            <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark overflow-hidden">
              {submission?.entries.map((entry) => (
                <View
                  key={entry.id}
                  className="py-4 px-4 flex-row items-center border-b border-border dark:border-border-dark last:border-b-0"
                >
                  <View className="w-8 h-8 rounded-full bg-ocean-soft items-center justify-center mr-3">
                    <ThemedText variant="tiny" className="text-ocean font-bold">
                      {entry.student_membership?.user?.full_name?.charAt(0) || '?'}
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" className="flex-1">
                    {entry.student_membership?.user?.full_name || 'Unknown'}
                  </ThemedText>
                  <TextInput
                    value={scores[entry.student_membership_id] || ''}
                    onChangeText={(text) => setScores(prev => ({ ...prev, [entry.student_membership_id]: text }))}
                    keyboardType="decimal-pad"
                    className="w-20 rounded-xl bg-mist dark:bg-bg-dark border border-border dark:border-border-dark px-3 py-2 text-center text-text dark:text-text-dark"
                  />
                  <ThemedText variant="tiny" className="ml-2 text-text-muted dark:text-text-muted-dark">/{maxScore}</ThemedText>
                  {entry.deduction > 0 && (
                    <View className="ml-3 flex-row items-center">
                      <Ionicons name="remove-circle-outline" size={16} color="#ef4444" />
                      <ThemedText variant="tiny" className="ml-1 text-red-500">-{entry.deduction}</ThemedText>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            disabled={saving}
            onPress={() => void save()}
            className={`mt-6 rounded-2xl py-4 items-center ${saving ? 'bg-ocean/50' : 'bg-ocean'}`}
          >
            <ThemedText variant="body" className="text-white font-semibold">
              {saving ? 'Updating...' : 'Update Marks'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AssessmentDetail({ visible, submission, accessToken, onClose, onUpdated, customTypes }: {
  visible: boolean;
  submission: TeacherMarkSubmission | null;
  accessToken: string | null;
  onClose: () => void;
  onUpdated: () => void;
  customTypes: CustomAssessmentType[];
}) {
  if (!submission) return null;

  const average = submission.entries.length > 0
    ? Math.round(submission.entries.reduce((sum, entry) => sum + percent(entry.final_score, submission.max_score), 0) / submission.entries.length)
    : 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-mist dark:bg-bg-dark">
        <View className="px-5 pt-16 pb-4 bg-surface dark:bg-surface-dark flex-row items-center border-b border-border dark:border-border-dark">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <ThemedText variant="heading">Assessment Details</ThemedText>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          {/* Header */}
          <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-5 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <ThemedText variant="subheading">{submission.assessment_name}</ThemedText>
              <View className={`px-3 py-1 rounded-full`} style={{ backgroundColor: `${STATUS_COLORS[submission.status]}20` }}>
                <ThemedText variant="tiny" style={{ color: STATUS_COLORS[submission.status] }}>
                  {submission.status.replace('_', ' ')}
                </ThemedText>
              </View>
            </View>
            <View className="flex-row gap-4">
              <View>
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Type</ThemedText>
                <ThemedText variant="body">{getTypeLabel(submission.assessment_type, customTypes)}</ThemedText>
              </View>
              <View>
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Max Score</ThemedText>
                <ThemedText variant="body">{submission.max_score}</ThemedText>
              </View>
              <View>
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Class Avg</ThemedText>
                <ThemedText variant="body" className="text-ocean">{average}%</ThemedText>
              </View>
            </View>
          </View>

          {/* Student Marks */}
          <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark overflow-hidden">
            <View className="px-4 py-3 border-b border-border dark:border-border-dark bg-mist dark:bg-bg-dark">
              <View className="flex-row">
                <ThemedText variant="caption" className="flex-1">Student</ThemedText>
                <ThemedText variant="caption" className="w-20 text-center">Raw</ThemedText>
                <ThemedText variant="caption" className="w-16 text-center">Deduction</ThemedText>
                <ThemedText variant="caption" className="w-20 text-center">Final</ThemedText>
                <ThemedText variant="caption" className="w-16 text-center">%</ThemedText>
              </View>
            </View>
            {submission.entries.map((entry) => (
              <View
                key={entry.id}
                className="px-4 py-3 flex-row items-center border-b border-border dark:border-border-dark last:border-b-0"
              >
                <ThemedText variant="body" className="flex-1">
                  {entry.student_membership?.user?.full_name || 'Unknown'}
                </ThemedText>
                <ThemedText variant="body" className="w-20 text-center">
                  {entry.raw_score}
                </ThemedText>
                <ThemedText variant="body" className={`w-16 text-center ${entry.deduction > 0 ? 'text-red-500' : ''}`}>
                  {entry.deduction > 0 ? `-${entry.deduction}` : '-'}
                </ThemedText>
                <ThemedText variant="body" className="w-20 text-center font-semibold">
                  {entry.final_score}
                </ThemedText>
                <ThemedText variant="body" className={`w-16 text-center ${percent(entry.final_score, submission.max_score) >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                  {percent(entry.final_score, submission.max_score)}%
                </ThemedText>
              </View>
            ))}
          </View>

          {submission.entries.length === 0 && (
            <View className="py-10 items-center">
              <Ionicons name="people-outline" size={48} color="#64748b" />
              <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-3">
                No student marks recorded yet
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function AssessmentTypeManager({ visible, institutionId, customTypes, accessToken, onClose, onUpdated }: {
  visible: boolean;
  institutionId: string | undefined;
  customTypes: CustomAssessmentType[];
  accessToken: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!institutionId || !accessToken || !name.trim()) {
      showToast.error('Required fields', 'Please enter an assessment type name');
      return;
    }

    setLoading(true);
    try {
      await createAssessmentType(institutionId, { name: name.trim(), description: description.trim() }, accessToken);
      showToast.success('Assessment type created', 'New assessment type added successfully');
      setName('');
      setDescription('');
      onUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create assessment type';
      showToast.error('Creation failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    Alert.alert('Delete assessment type?', 'This will remove the assessment type. It cannot be deleted if it has existing marks.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteAssessmentType(id, accessToken);
          showToast.success('Deleted', 'Assessment type removed successfully');
          onUpdated();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete assessment type';
          showToast.error('Delete failed', message);
        }
      }}
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-mist dark:bg-bg-dark">
        <View className="px-5 pt-16 pb-4 bg-surface dark:bg-surface-dark flex-row items-center border-b border-border dark:border-border-dark">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <ThemedText variant="heading">Assessment Types</ThemedText>
            <ThemedText variant="tiny">Manage custom assessment types</ThemedText>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          {/* Create New Type */}
          <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-5 mb-4">
            <ThemedText variant="subheading" className="mb-3">Create New Type</ThemedText>
            <View className="mb-3">
              <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Name</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Lab, Practical, Midterm"
                placeholderTextColor="#64748b"
                className="rounded-xl bg-mist dark:bg-bg-dark border border-border dark:border-border-dark px-4 py-3 text-text dark:text-text-dark"
              />
            </View>
            <View className="mb-3">
              <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mb-2">Description (optional)</ThemedText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description of this assessment type"
                placeholderTextColor="#64748b"
                className="rounded-xl bg-mist dark:bg-bg-dark border border-border dark:border-border-dark px-4 py-3 text-text dark:text-text-dark"
              />
            </View>
            <TouchableOpacity
              disabled={loading}
              onPress={() => void handleCreate()}
              className={`rounded-xl py-3 items-center ${loading ? 'bg-ocean/50' : 'bg-ocean'}`}
            >
              <ThemedText variant="body" className="text-white font-semibold">
                {loading ? 'Creating...' : 'Create Type'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Custom Types List */}
          <ThemedText variant="subheading" className="mb-3">Custom Types</ThemedText>
          {customTypes.length === 0 ? (
            <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-8 items-center">
              <Ionicons name="document-outline" size={48} color="#64748b" />
              <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-3 text-center">
                No custom assessment types yet
              </ThemedText>
            </View>
          ) : (
            customTypes.map((type) => (
              <View
                key={type.id}
                className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4 mb-3 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <ThemedText variant="body">{type.name}</ThemedText>
                  {type.description && (
                    <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">
                      {type.description}
                    </ThemedText>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => void handleDelete(type.id)}
                  className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Default Types Info */}
          <View className="mt-6 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4">
            <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark">
              Default types (Quiz, Assignment, Project, Exam) cannot be deleted. You can only manage custom types created here.
            </ThemedText>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
