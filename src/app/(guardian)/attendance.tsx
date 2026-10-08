// src/app/(guardian)/attendance.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth/AuthContext';
import { useAppTheme } from '@/ui/useAppTheme';
import { AppText } from '@/ui/AppText';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import {
  fetchGuardianAttendance,
  GuardianAttendanceData,
  LinkedStudent,
} from '@/lib/api/guardian';

type FilterType = 'all' | 'present' | 'absent';

export default function GuardianAttendanceScreen() {
  const { colors } = useAppTheme();
  const { accessToken, currentMembership } = useAuth();
  const institutionId = currentMembership?.institution_id;

  const [data, setData] = useState<GuardianAttendanceData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!institutionId || !accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetchGuardianAttendance(
          institutionId,
          accessToken,
          selectedStudent?.membership_id,
        );
        setData(res);
        if (!selectedStudent && res.student) {
          setSelectedStudent(res.student);
        }
      } catch (err: any) {
        showToast.error('Load Error', err?.message || 'Could not load student attendance.');
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

  const filteredAttendance = useMemo(() => {
    if (!data?.attendance) return [];
    if (filter === 'all') return data.attendance;
    return data.attendance.filter((item) => item.status === filter);
  }, [data?.attendance, filter]);

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
          Loading attendance records...
        </AppText>
      </View>
    );
  }

  const student = data?.student;
  const stats = data?.stats;
  const rate = stats?.attendance_percent ?? 100;
  const rateColor =
    rate >= 85 ? colors.success : rate >= 70 ? colors.warning : colors.danger;

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
      {/* Multiple Children Switcher Bar (if more than 1 linked student) */}
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
                  <Ionicons
                    name="person"
                    size={14}
                    color={active ? '#ffffff' : colors.text}
                  />
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

      {/* Main Attendance Stats Hero */}
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
              ATTENDANCE REPORT
            </AppText>
            <AppText variant="heading" weight="bold" color={colors.text} style={{ marginTop: 2 }}>
              {student ? student.full_name : 'Student Report'}
            </AppText>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: `${rateColor}20`,
            }}
          >
            <AppText variant="caption" weight="bold" color={rateColor}>
              {rate >= 80 ? 'EXCELLENT' : rate >= 70 ? 'FAIR' : 'ACTION NEEDED'}
            </AppText>
          </View>
        </View>

        {/* Big Percentage Display */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <AppText variant="display" weight="bold" color={rateColor} style={{ fontSize: 48 }}>
            {rate}%
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            Overall attendance compliance across all enrolled courses
          </AppText>
        </View>

        {/* 3 Metric Pills */}
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            marginTop: 22,
            paddingTop: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}
        >
          {/* Total Sessions */}
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
              Total
            </AppText>
            <AppText variant="title" weight="bold" color={colors.text} style={{ marginTop: 2 }}>
              {stats?.total ?? 0}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Sessions
            </AppText>
          </View>

          {/* Present */}
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <AppText variant="caption" color={colors.success}>
              Present
            </AppText>
            <AppText variant="title" weight="bold" color={colors.success} style={{ marginTop: 2 }}>
              {stats?.present ?? 0}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Attended
            </AppText>
          </View>

          {/* Absent */}
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <AppText variant="caption" color={colors.danger}>
              Absent
            </AppText>
            <AppText variant="title" weight="bold" color={colors.danger} style={{ marginTop: 2 }}>
              {stats?.absent ?? 0}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Missed
            </AppText>
          </View>
        </View>
      </View>

      {/* Course Attendance Breakdown */}
      {data?.courses && data.courses.length > 0 ? (
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <AppText variant="heading" weight="bold" color={colors.text} style={{ marginBottom: 12 }}>
            Course Breakdown
          </AppText>
          <View
            style={{
              padding: 16,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 14,
            }}
          >
            {data.courses.map((course) => {
              const courseRate = course.attendance_rate ?? 100;
              const color =
                courseRate >= 80 ? colors.success : courseRate >= 70 ? colors.warning : colors.danger;
              return (
                <View key={course.class_id}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <AppText variant="body" weight="bold" color={colors.text} numberOfLines={1}>
                        {course.course_name}
                      </AppText>
                      <AppText variant="caption" color={colors.textMuted}>
                        {course.course_code} · {course.teacher_name}
                      </AppText>
                    </View>
                    <AppText variant="caption" weight="bold" color={color}>
                      {courseRate}%
                    </AppText>
                  </View>
                  {/* Progress Bar */}
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.surfaceMuted,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${courseRate}%`,
                        backgroundColor: color,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Session History Header & Filter Pills */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <AppText variant="heading" weight="bold" color={colors.text}>
            Session History
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {filteredAttendance.length} records
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'present', 'absent'] as FilterType[]).map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  haptics.selection();
                  setFilter(f);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 16,
                  backgroundColor: active ? colors.brand : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.brand : colors.border,
                }}
              >
                <AppText
                  variant="caption"
                  weight={active ? 'bold' : 'regular'}
                  color={active ? '#ffffff' : colors.text}
                >
                  {f === 'all' ? 'All Sessions' : f === 'present' ? 'Present Only' : 'Absences Only'}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Session List */}
      <View style={{ paddingHorizontal: 20 }}>
        {filteredAttendance.length === 0 ? (
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
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.textMuted} />
            <AppText variant="body" weight="bold" color={colors.text} style={{ marginTop: 8 }}>
              No sessions in this filter
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              All attendance records match criteria.
            </AppText>
          </View>
        ) : (
          filteredAttendance.map((session) => {
            const isPresent = session.status === 'present';
            const statusColor = isPresent ? colors.success : colors.danger;
            const formattedDate = new Date(session.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <View
                key={session.id}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <AppText variant="body" weight="bold" color={colors.text} numberOfLines={1}>
                    {session.course_name}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                    {session.course_code} · {formattedDate} {session.time ? `· ${session.time}` : ''}
                  </AppText>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    backgroundColor: `${statusColor}18`,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={isPresent ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={statusColor}
                  />
                  <AppText variant="caption" weight="bold" color={statusColor}>
                    {isPresent ? 'PRESENT' : 'ABSENT'}
                  </AppText>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
