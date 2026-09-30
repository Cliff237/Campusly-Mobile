import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { EmptyStateAnimation } from '@/ui/EmptyStateAnimation';
import { showToast } from '@/ui/Toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { createMarkSubmission, deleteMarkSubmission, fetchClassMarkSubmissions, fetchTeacherClasses, updateMarkSubmission } from '@/lib/api/teacherMarks';
import { fetchAttendanceRoster, fetchAttendanceSessions } from '@/lib/api/attendance';
import type { MarkAssessmentType, TeacherClass, TeacherMarkSubmission } from '@/lib/types/teacherMarks';
import type { AttendanceRosterStudent, AttendanceSessionSummary } from '@/lib/types/attendance';

const TYPES: MarkAssessmentType[] = ['quiz', 'assignment', 'project', 'exam'];
const TYPE_LABELS: Record<MarkAssessmentType, string> = { quiz: 'Quiz', assignment: 'Assignment', project: 'Project', exam: 'Exam' };
const TYPE_ICONS: Record<MarkAssessmentType, keyof typeof Ionicons.glyphMap> = { quiz: 'document-text-outline', assignment: 'clipboard-outline', project: 'folder-outline', exam: 'school-outline' };
const STATUS_COLORS: Record<string, string> = { pending_approval: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

const percent = (score: number, max: number) => max ? Math.round((score / max) * 100) : 0;

export default function TeacherMarksScreen() {
  const { accessToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selected, setSelected] = useState<TeacherClass | null>(null);
  const [submissions, setSubmissions] = useState<TeacherMarkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composer, setComposer] = useState(false);
  const [editing, setEditing] = useState<TeacherMarkSubmission | null>(null);
  const [viewDetail, setViewDetail] = useState<TeacherMarkSubmission | null>(null);
  const [filterType, setFilterType] = useState<MarkAssessmentType | 'all'>('all');

  const load = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    setRefreshing(refresh);
    try {
      const classList = await fetchTeacherClasses(accessToken);
      setClasses(classList);
      const target = selected && classList.some((item) => item.id === selected.id) ? selected : classList[0] ?? null;
      setSelected(target);
      setSubmissions(target ? await fetchClassMarkSubmissions(target.id, accessToken) : []);
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
      className="flex-1 bg-mist dark:bg-bg-dark" 
      contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#0f766e" />}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <ThemedText variant="display">Marks</ThemedText>
          <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-1">
            Manage assessments and student grades
          </ThemedText>
        </View>
        <TouchableOpacity 
          accessibilityRole="button"
          accessibilityLabel="Create mark submission"
          onPress={() => setComposer(true)}
          className="w-12 h-12 rounded-2xl bg-ocean items-center justify-center shadow-lg"
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Statistics Dashboard */}
      {stats && (
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4">
            <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Class Avg</ThemedText>
            <ThemedText variant="heading" className="text-ocean mt-1">{stats.classAverage}%</ThemedText>
          </View>
          <View className="flex-1 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4">
            <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Assessments</ThemedText>
            <ThemedText variant="heading" className="text-ink mt-1">{stats.totalAssessments}</ThemedText>
          </View>
          <View className="flex-1 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4">
            <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Students</ThemedText>
            <ThemedText variant="heading" className="text-berry mt-1">{stats.totalStudents}</ThemedText>
          </View>
        </View>
      )}

      {/* Class Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="mb-6"
      >
        <View className="flex-row gap-3">
          {classes.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => void choose(item)}
              className={`rounded-2xl px-5 py-4 border-2 ${
                selected?.id === item.id 
                  ? 'bg-ink border-ink' 
                  : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
              }`}
            >
              <ThemedText 
                variant="body" 
                className={selected?.id === item.id ? 'text-white font-bold' : ''}
              >
                {item.course_code}
              </ThemedText>
              <ThemedText 
                variant="tiny" 
                className={`mt-1 ${selected?.id === item.id ? 'text-slate-300' : 'text-text-muted dark:text-text-muted-dark'}`}
              >
                {item.section} · {item.enrolled_count} students
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Filter */}
      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          className={`px-4 py-2 rounded-full ${filterType === 'all' ? 'bg-ocean' : 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark'}`}
        >
          <ThemedText variant="tiny" className={filterType === 'all' ? 'text-white font-bold' : ''}>All</ThemedText>
        </TouchableOpacity>
        {TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setFilterType(type)}
            className={`px-4 py-2 rounded-full ${filterType === type ? 'bg-ocean' : 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark'}`}
          >
            <ThemedText variant="tiny" className={filterType === type ? 'text-white font-bold' : ''}>{TYPE_LABELS[type]}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading State */}
      {loading ? (
        <View className="py-20 items-center">
          <ActivityIndicator color="#6846dc" size="large" />
          <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-3">Loading marks...</ThemedText>
        </View>
      ) : !selected ? (
        <EmptyStateAnimation 
          icon="book-outline" 
          title="No assigned courses" 
          subtitle="Your assigned course sections will appear here." 
        />
      ) : filteredSubmissions.length ? (
        filteredSubmissions.map((submission) => {
          const graded = submission.entries.length;
          const average = graded 
            ? Math.round(submission.entries.reduce((sum, entry) => sum + percent(entry.final_score, submission.max_score), 0) / graded)
            : 0;
          const statusColor = STATUS_COLORS[submission.status] || '#64748b';
          
          return (
            <TouchableOpacity
              key={submission.id}
              onPress={() => setViewDetail(submission)}
              className="rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-5 mb-4 shadow-sm"
            >
              <View className="flex-row items-start">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center ${submission.assessment_type === 'exam' ? 'bg-berry-soft' : 'bg-ocean-soft'}`}>
                  <Ionicons name={TYPE_ICONS[submission.assessment_type]} size={24} color={submission.assessment_type === 'exam' ? '#ef4444' : '#6846dc'} />
                </View>
                <View className="flex-1 ml-4">
                  <View className="flex-row items-center gap-2">
                    <ThemedText variant="subheading">{submission.assessment_name}</ThemedText>
                    <View className={`px-2 py-0.5 rounded-full`} style={{ backgroundColor: `${statusColor}20` }}>
                      <ThemedText variant="tiny" style={{ color: statusColor }}>
                        {submission.status.replace('_', ' ')}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark mt-1">
                    {TYPE_LABELS[submission.assessment_type]} · Max: {submission.max_score}
                  </ThemedText>
                </View>
                <View className="items-end ml-3">
                  <ThemedText variant="heading" className="text-ocean">{average}%</ThemedText>
                  <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">avg</ThemedText>
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-border dark:border-border-dark">
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={16} color="#64748b" />
                    <ThemedText variant="caption" className="ml-1 text-text-muted dark:text-text-muted-dark">
                      {graded}/{selected.enrolled_count} graded
                    </ThemedText>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <ThemedText variant="caption" className="ml-1 text-text-muted dark:text-text-muted-dark">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  {submission.status === 'pending_approval' && (
                    <TouchableOpacity
                      onPress={() => setEditing(submission)}
                      className="w-8 h-8 rounded-xl bg-ocean-soft items-center justify-center"
                    >
                      <Ionicons name="create-outline" size={18} color="#6846dc" />
                    </TouchableOpacity>
                  )}
                  {submission.status !== 'approved' && (
                    <TouchableOpacity
                      onPress={() => removeAssessment(submission)}
                      className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 items-center justify-center"
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <EmptyStateAnimation 
          icon="ribbon-outline" 
          title="No mark submissions" 
          subtitle={`No ${filterType === 'all' ? '' : TYPE_LABELS[filterType as MarkAssessmentType] + ' '}assessments found for this class.`}
        />
      )}

      {/* Compose Modal */}
      <GradeComposer 
        visible={composer} 
        course={selected} 
        accessToken={accessToken} 
        onClose={() => setComposer(false)} 
        onCreated={() => void load(true)} 
      />

      {/* Edit Modal */}
      <EditComposer
        visible={!!editing}
        submission={editing}
        accessToken={accessToken}
        onClose={() => setEditing(null)}
        onUpdated={() => void load(true)}
      />

      {/* Detail Modal */}
      <AssessmentDetail
        visible={!!viewDetail}
        submission={viewDetail}
        accessToken={accessToken}
        onClose={() => setViewDetail(null)}
        onUpdated={() => void load(true)}
      />
    </ScrollView>
  );
}

function GradeComposer({ visible, course, accessToken, onClose, onCreated }: { 
  visible: boolean; 
  course: TeacherClass | null; 
  accessToken: string | null; 
  onClose: () => void; 
  onCreated: () => void; 
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
            <View className="flex-row gap-2">
              {TYPES.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setType(item)}
                  className={`flex-1 rounded-xl px-3 py-3 border-2 ${
                    type === item ? 'bg-ocean border-ocean' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  <ThemedText variant="caption" className={type === item ? 'text-white font-bold text-center' : 'text-center'}>
                    {TYPE_LABELS[item]}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
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

function EditComposer({ visible, submission, accessToken, onClose, onUpdated }: {
  visible: boolean;
  submission: TeacherMarkSubmission | null;
  accessToken: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MarkAssessmentType>('quiz');
  const [maxScore, setMaxScore] = useState('20');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
            <View className="flex-row gap-2">
              {TYPES.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setType(item)}
                  className={`flex-1 rounded-xl px-3 py-3 border-2 ${
                    type === item ? 'bg-ocean border-ocean' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                  }`}
                >
                  <ThemedText variant="caption" className={type === item ? 'text-white font-bold text-center' : 'text-center'}>
                    {TYPE_LABELS[item]}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
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

function AssessmentDetail({ visible, submission, accessToken, onClose, onUpdated }: {
  visible: boolean;
  submission: TeacherMarkSubmission | null;
  accessToken: string | null;
  onClose: () => void;
  onUpdated: () => void;
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
                <ThemedText variant="body">{TYPE_LABELS[submission.assessment_type]}</ThemedText>
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
