import { useState } from 'react';
import { LayoutAnimation, Platform, TouchableOpacity, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import type { CourseGradeCardData } from '@/lib/types/student';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);

function letterFor(percent: number) {
  if (percent >= 85) return { letter: 'A', tone: 'text-emerald-600', soft: 'bg-emerald-100' };
  if (percent >= 70) return { letter: 'B', tone: 'text-sky-600', soft: 'bg-sky-100' };
  if (percent >= 60) return { letter: 'C', tone: 'text-sun', soft: 'bg-sun-soft' };
  return { letter: 'D', tone: 'text-berry', soft: 'bg-berry-soft' };
}

export function CourseGradeCard({ course }: { course: CourseGradeCardData & { course_id: string } }) {
  const [open, setOpen] = useState(false);
  const percent = course.total_percent ?? 0; const grade = course.letter_grade ?? letterFor(percent).letter;
  const toggle = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((value) => !value); };
  return <View className="mx-5 mb-4 rounded-3xl overflow-hidden border border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${course.course_name} grade breakdown`} onPress={toggle} className="p-5">
      <View className="flex-row items-start"><View className={`w-12 h-12 rounded-2xl items-center justify-center ${letterFor(percent).soft}`}><ThemedText variant="heading" className={letterFor(percent).tone}>{grade}</ThemedText></View><View className="flex-1 ml-3"><ThemedText variant="subheading" numberOfLines={1}>{course.course_name}</ThemedText><ThemedText variant="tiny" className="mt-0.5">{course.teacher_name ?? 'Course grade'} · {course.items.length} assessment{course.items.length === 1 ? '' : 's'}</ThemedText></View><View className="items-end"><ThemedText variant="heading" className={letterFor(percent).tone}>{course.total_percent == null ? '—' : `${percent}%`}</ThemedText><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" /></View></View>
      {course.total_percent != null ? <View className="h-2 rounded-full bg-mist dark:bg-bg-dark overflow-hidden mt-4"><View className="h-full rounded-full bg-ocean" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></View> : null}
    </TouchableOpacity>
    {open ? <View className="border-t border-border dark:border-border-dark px-5 pt-4 pb-5">
      <ThemedText variant="tiny" className="font-bold text-text-muted dark:text-text-muted-dark mb-3">ASSESSMENT BREAKDOWN</ThemedText>
      {course.items.length ? (
        <>
          {course.items.map((item) => {
            const raw = item.raw_score ?? item.score + (item.deduction ?? 0);
            const itemPercent = item.max_score ? Math.round((item.score / item.max_score) * 100) : 0;
            const gradeInfo = letterFor(itemPercent);
            return <View key={item.id} className="py-3 border-b border-border dark:border-border-dark last:border-b-0">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 pr-2">
                  <ThemedText variant="caption" className="font-semibold">{item.assessment_name}</ThemedText>
                  <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">{item.assessment_type ?? 'Assessment'}</ThemedText>
                </View>
                <View className={`px-2 py-1 rounded-lg ${gradeInfo.soft}`}>
                  <ThemedText variant="tiny" className={gradeInfo.tone}>{itemPercent}%</ThemedText>
                </View>
              </View>
              <View className="flex-row mt-2 gap-4">
                <View className="flex-1">
                  <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Raw score</ThemedText>
                  <ThemedText variant="caption" className="font-semibold">{raw}/{item.max_score}</ThemedText>
                </View>
                <View className="flex-1">
                  <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Deduction</ThemedText>
                  <ThemedText variant="caption" className={`font-semibold ${(item.deduction ?? 0) > 0 ? 'text-berry' : ''}`}>{(item.deduction ?? 0) > 0 ? `-${item.deduction}` : '—'}</ThemedText>
                </View>
                <View className="flex-1">
                  <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Final score</ThemedText>
                  <ThemedText variant="caption" className="font-semibold">{item.score}/{item.max_score}</ThemedText>
                </View>
              </View>
              {(item.deduction_reason && (item.deduction ?? 0) > 0) ? <View className="mt-2 rounded-xl bg-mist dark:bg-bg-dark px-3 py-2"><ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark"><Ionicons name="information-circle-outline" size={12} color="#64748b" /> {item.deduction_reason}</ThemedText></View> : null}
            </View>;
          })}
          <View className="mt-4 rounded-2xl bg-mist dark:bg-bg-dark p-4">
            <View className="flex-row gap-4">
              <View className="flex-1">
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Assessment total</ThemedText>
                <ThemedText variant="body" className="font-bold">{course.total_percent == null ? 'Pending' : `${course.total_percent}%`}</ThemedText>
              </View>
              <View className="flex-1">
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Total deductions</ThemedText>
                <ThemedText variant="body" className="font-bold text-berry">−{course.total_deduction ?? course.attendance_penalty ?? 0}</ThemedText>
              </View>
              <View className="flex-1">
                <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Final grade</ThemedText>
                <ThemedText variant="body" className={`font-bold ${letterFor(percent).tone}`}>{grade}</ThemedText>
              </View>
            </View>
          </View>
        </>
      ) : <ThemedText variant="caption" className="py-3 text-center text-text-muted dark:text-text-muted-dark">No approved marks have been published yet.</ThemedText>}
    </View> : null}
  </View>;
}
