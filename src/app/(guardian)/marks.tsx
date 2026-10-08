// src/app/(guardian)/marks.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { useAuth } from '@/lib/auth/AuthContext';
import { useAppTheme } from '@/ui/useAppTheme';
import { AppText } from '@/ui/AppText';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import {
  fetchGuardianPerformance,
  createGuardianReportCard,
  GuardianPerformanceData,
  LinkedStudent,
} from '@/lib/api/guardian';

export default function GuardianMarksScreen() {
  const { colors } = useAppTheme();
  const { accessToken, currentMembership } = useAuth();
  const institutionId = currentMembership?.institution_id;

  const [data, setData] = useState<GuardianPerformanceData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!institutionId || !accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetchGuardianPerformance(
          institutionId,
          accessToken,
          selectedStudent?.membership_id,
        );
        setData(res);
        if (!selectedStudent && res.student) {
          setSelectedStudent(res.student);
        }
      } catch (err: any) {
        showToast.error('Load Error', err?.message || 'Could not load student performance.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [institutionId, accessToken, selectedStudent?.membership_id],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadReportCard = async () => {
    if (!institutionId || !accessToken) return;
    haptics.medium();
    setDownloadingReport(true);
    try {
      const res = await createGuardianReportCard(
        institutionId,
        accessToken,
        selectedStudent?.membership_id,
      );
      showToast.success('Report Card Ready', 'Opening academic transcript.');
      if (res.url) {
        Linking.openURL(res.url);
      }
    } catch (err: any) {
      showToast.error('Download Failed', err?.message || 'Could not generate report card.');
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.brand} />
        <AppText variant="body" color={colors.textMuted} style={{ marginTop: 12 }}>
          Loading academic performance...
        </AppText>
      </View>
    );
  }

  const student = data?.student;
  const stats = data?.stats;
  const grades = data?.grades || [];
  const gpa = stats?.gpa ?? 3.5;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.brand}
        />
      }
    >
      {/* Student Switcher Bar (if more than 1 linked student) */}
      {data?.linked_students && data.linked_students.length > 1 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {data.linked_students.map((s) => {
              const active = selectedStudent?.membership_id === s.membership_id;
              return (
                <TouchableOpacity
                  key={s.membership_id}
                  onPress={() => {
                    haptics.selection();
                    setSelectedStudent(s);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: active ? colors.brand : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.border,
                  }}
                >
                  <Ionicons name="person" size={14} color={active ? '#ffffff' : colors.text} />
                  <AppText
                    variant="caption"
                    weight={active ? 'bold' : 'regular'}
                    color={active ? '#ffffff' : colors.text}
                  >
                    {s.full_name}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Academic Performance Hero Card */}
      <View
        style={{
          margin: 20,
          padding: 22,
          borderRadius: 24,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <AppText variant="caption" weight="bold" color={colors.brand}>
              ACADEMIC PERFORMANCE
            </AppText>
            <AppText variant="heading" weight="bold" color={colors.text} style={{ marginTop: 2 }}>
              {student ? student.full_name : 'Student Performance'}
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
            <AppText variant="caption" weight="bold" color={colors.brand}>
              CURRENT TERM
            </AppText>
          </View>
        </View>

        {/* Big GPA Metric */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <AppText variant="display" weight="bold" color={colors.brand} style={{ fontSize: 48 }}>
            {gpa} <AppText variant="heading" color={colors.textMuted}>/ 4.0</AppText>
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            Cumulative Grade Point Average across {grades.length} courses
          </AppText>
        </View>

        {/* Credits Row */}
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}
        >
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <AppText variant="caption" color={colors.textMuted}>
              Credits Total
            </AppText>
            <AppText variant="title" weight="bold" color={colors.text} style={{ marginTop: 2 }}>
              {stats?.credits_total ?? grades.length * 3}
            </AppText>
          </View>

          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <AppText variant="caption" color={colors.textMuted}>
              Courses Evaluated
            </AppText>
            <AppText variant="title" weight="bold" color={colors.brand} style={{ marginTop: 2 }}>
              {grades.length}
            </AppText>
          </View>
        </View>

        {/* Download Report Card Button */}
        <TouchableOpacity
          onPress={handleDownloadReportCard}
          disabled={downloadingReport}
          style={{
            marginTop: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 16,
            backgroundColor: colors.brand,
          }}
        >
          {downloadingReport ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color="#ffffff" />
              <AppText variant="body" weight="bold" color="#ffffff">
                Download Official Report Card (PDF)
              </AppText>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Courses List Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AppText variant="heading" weight="bold" color={colors.text}>
          Course Grades & Assessments
        </AppText>
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
          Tap on a course to inspect individual quiz and exam scores.
        </AppText>
      </View>

      {/* Courses Accordion List */}
      <View style={{ paddingHorizontal: 20 }}>
        {grades.length === 0 ? (
          <View
            style={{
              padding: 28,
              alignItems: 'center',
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="school-outline" size={40} color={colors.textMuted} />
            <AppText variant="body" weight="bold" color={colors.text} style={{ marginTop: 8 }}>
              No grades recorded yet
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              Marks will appear once the teacher publishes assessment results.
            </AppText>
          </View>
        ) : (
          grades.map((grade) => {
            const isExpanded = expandedCourseId === grade.class_id;
            const letter = grade.letter_grade || 'A';
            const gradeColor =
              letter === 'A' ? colors.success : letter === 'B' ? colors.brand : colors.warning;

            return (
              <View
                key={grade.class_id}
                style={{
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: isExpanded ? colors.brand : colors.border,
                  marginBottom: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Header Row */}
                <TouchableOpacity
                  onPress={() => {
                    haptics.selection();
                    setExpandedCourseId(isExpanded ? null : grade.class_id);
                  }}
                  style={{
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <AppText variant="body" weight="bold" color={colors.text}>
                      {grade.course_name}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                      Instructor: {grade.teacher_name}
                    </AppText>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor: `${gradeColor}20`,
                        }}
                      >
                        <AppText variant="caption" weight="bold" color={gradeColor}>
                          Grade {letter}
                        </AppText>
                      </View>
                      <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                        {grade.total_percent != null ? `${grade.total_percent}%` : 'Pending'}
                      </AppText>
                    </View>

                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Assessment Items */}
                {isExpanded && (
                  <View
                    style={{
                      padding: 16,
                      paddingTop: 12,
                      backgroundColor: colors.surfaceMuted,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.border,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <AppText variant="overline" color={colors.textMuted}>
                        ASSESSMENT
                      </AppText>
                      <AppText variant="overline" color={colors.textMuted}>
                        SCORE / MAX
                      </AppText>
                    </View>

                    {grade.items && grade.items.length > 0 ? (
                      grade.items.map((item) => {
                        const scorePercent = Math.round((item.score / item.max_score) * 100);
                        return (
                          <View
                            key={item.id}
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              backgroundColor: colors.surface,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <AppText variant="body" weight="bold" color={colors.text}>
                                  {item.assessment_name}
                                </AppText>
                                <AppText variant="caption" color={colors.textMuted}>
                                  Type: {item.assessment_type?.toUpperCase()}
                                </AppText>
                              </View>

                              <View style={{ alignItems: 'flex-end' }}>
                                <AppText variant="body" weight="bold" color={colors.text}>
                                  {item.score} / {item.max_score}
                                </AppText>
                                <AppText
                                  variant="caption"
                                  weight="bold"
                                  color={scorePercent >= 80 ? colors.success : colors.brand}
                                >
                                  {scorePercent}%
                                </AppText>
                              </View>
                            </View>

                            {/* Deduction Warning if any */}
                            {(item.deduction ?? 0) > 0 && (
                              <View
                                style={{
                                  marginTop: 8,
                                  paddingTop: 6,
                                  borderTopWidth: StyleSheet.hairlineWidth,
                                  borderTopColor: colors.border,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                                <AppText variant="caption" color={colors.danger}>
                                  Deduction: -{item.deduction} pts ({item.deduction_reason || 'Disciplinary / Late'})
                                </AppText>
                              </View>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <AppText variant="caption" color={colors.textMuted} style={{ textAlign: 'center', padding: 8 }}>
                        No specific assessment submissions published yet.
                      </AppText>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
