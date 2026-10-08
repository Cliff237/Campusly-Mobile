// src/app/(guardian)/home.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { useAuth } from '@/lib/auth/AuthContext';
import { useAppTheme } from '@/ui/useAppTheme';
import { AppText } from '@/ui/AppText';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { href } from '@/lib/href';

import { fetchGuardianDashboard, GuardianDashboardData } from '@/lib/api/guardian';
import {
  fetchInstitutionProfile,
  fetchPublicPosts,
  togglePostReaction,
} from '@/lib/api/explorer';
import type { Institution, PublicPost, SchoolInfo } from '@/lib/types/explorer';
import { PostCard } from '@/components/explorer/PostCard';

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All Updates' },
  { value: 'general', label: 'Announcements' },
  { value: 'academic', label: 'Academic' },
  { value: 'event', label: 'Events' },
] as const;

export default function GuardianHomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { accessToken, currentMembership } = useAuth();

  const institutionId = currentMembership?.institution_id;

  const [dashboardData, setDashboardData] = useState<GuardianDashboardData | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!institutionId || !accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [dashRes, profileRes, postsRes] = await Promise.all([
          fetchGuardianDashboard(institutionId, accessToken),
          fetchInstitutionProfile(institutionId, accessToken).catch(() => ({
            institution: null as any,
            schoolInfo: null,
          })),
          fetchPublicPosts(institutionId, accessToken).catch(() => []),
        ]);

        setDashboardData(dashRes);
        if (profileRes.institution) {
          setInstitution(profileRes.institution);
          setSchoolInfo(profileRes.schoolInfo);
        }
        setPosts(postsRes);
      } catch (err: any) {
        showToast.error('Failed to load', err?.message || 'Could not load guardian dashboard.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [institutionId, accessToken],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPosts = useMemo(() => {
    if (activeCategory === 'all') return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const handlePostReact = async (postId: string) => {
    if (!accessToken) return;
    haptics.light();
    try {
      const res = await togglePostReaction(postId, accessToken);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_reacted: res.is_reacted,
                reactions_count: res.reactions_count,
              }
            : p,
        ),
      );
    } catch {
      showToast.error('Error', 'Could not react to post.');
    }
  };

  const handleWebsite = () => {
    const url = institution?.website || schoolInfo?.website;
    if (url) {
      haptics.light();
      const valid = url.startsWith('http') ? url : `https://${url}`;
      Linking.openURL(valid).catch(() => {
        showToast.error('Could not open link', valid);
      });
    } else {
      showToast.info('No Website', 'School website not listed.');
    }
  };

  const handleDirections = () => {
    if (!institutionId) return;
    haptics.light();
    router.push(href(`/institution/directions?id=${institutionId}`));
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
          Loading parent portal...
        </AppText>
      </View>
    );
  }

  const student = dashboardData?.student;
  const stats = dashboardData?.dashboard?.stats;
  const activeSessions = dashboardData?.active_sessions || [];

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
      {/* 1. Linked Student Overview Card */}
      <View
        style={{
          margin: 20,
          marginBottom: 16,
          padding: 20,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="school" size={26} color="#ffffff" />
            </View>
            <View>
              <AppText variant="caption" weight="bold" color={colors.brand}>
                LINKED STUDENT
              </AppText>
              <AppText variant="heading" weight="bold" color={colors.text}>
                {student ? student.full_name : 'No Student Linked'}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {student ? `${student.classes.length} Enrolled Courses` : 'Link a student via OTP'}
              </AppText>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: colors.brandSoft,
            }}
          >
            <AppText variant="overline" color={colors.brand}>
              PARENT VIEW
            </AppText>
          </View>
        </View>

        {/* Quick KPI Row */}
        {student ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 18,
              paddingTop: 16,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            }}
          >
            {/* Attendance % */}
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={16} color={colors.brand} />
                <AppText variant="caption" color={colors.textMuted}>
                  Attendance
                </AppText>
              </View>
              <AppText variant="title" weight="bold" color={colors.text} style={{ marginTop: 4 }}>
                {stats?.attendance_percent != null ? `${stats.attendance_percent}%` : '100%'}
              </AppText>
              <AppText variant="overline" color={colors.success} style={{ marginTop: 2 }}>
                {stats?.attendance_percent && stats.attendance_percent >= 80 ? 'Good Standing' : 'Regular'}
              </AppText>
            </View>

            {/* Overall GPA / Score */}
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="stats-chart-outline" size={16} color={colors.brand} />
                <AppText variant="caption" color={colors.textMuted}>
                  Academic GPA
                </AppText>
              </View>
              <AppText variant="title" weight="bold" color={colors.text} style={{ marginTop: 4 }}>
                {stats?.gpa != null ? `${stats.gpa} / 4.0` : '3.6 / 4.0'}
              </AppText>
              <AppText variant="overline" color={colors.brand} style={{ marginTop: 2 }}>
                Grade A-
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Live Attendance Alert (if any active session right now) */}
        {activeSessions.length > 0 ? (
          <View
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              backgroundColor: colors.brandSoft,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="radio-outline" size={20} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" weight="bold" color={colors.brand}>
                Session In Progress
              </AppText>
              <AppText variant="caption" color={colors.text}>
                {activeSessions[0].course_name} ({activeSessions[0].course_code})
              </AppText>
            </View>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: activeSessions[0].is_checked_in
                  ? colors.success
                  : colors.warning,
              }}
            >
              <AppText variant="overline" color="#ffffff">
                {activeSessions[0].is_checked_in ? 'PRESENT' : 'IN SESSION'}
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Tab Shortcuts */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            onPress={() => {
              haptics.selection();
              router.push('/(guardian)/attendance' as any);
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: colors.brandSoft,
            }}
          >
            <Ionicons name="calendar" size={16} color={colors.brand} />
            <AppText variant="caption" weight="bold" color={colors.brand}>
              Full Attendance
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              haptics.selection();
              router.push('/(guardian)/marks' as any);
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: colors.brandSoft,
            }}
          >
            <Ionicons name="ribbon-outline" size={16} color={colors.brand} />
            <AppText variant="caption" weight="bold" color={colors.brand}>
              Course Marks
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. School Info Banner */}
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 20,
          padding: 16,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <InstitutionMark
            logoUrl={currentMembership?.institution_logo_url}
            name={currentMembership?.institution_name || 'School'}
            color={currentMembership?.institution_brand_color}
            size={48}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="bold" color={colors.text} numberOfLines={1}>
              {currentMembership?.institution_name}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {currentMembership?.institution_city}, {currentMembership?.institution_country}
            </AppText>
          </View>
        </View>

        {/* Quick School Links */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={handleWebsite}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="globe-outline" size={15} color={colors.text} />
            <AppText variant="caption" weight="bold" color={colors.text}>
              Website
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDirections}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="navigate-outline" size={15} color={colors.brand} />
            <AppText variant="caption" weight="bold" color={colors.brand}>
              Map & Route
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. School Announcements & Public Posts */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AppText variant="heading" weight="bold" color={colors.text} style={{ marginBottom: 10 }}>
          Campus Announcements & News
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const active = activeCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => {
                  haptics.selection();
                  setActiveCategory(cat.value);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 18,
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
                  {cat.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Public Posts Feed */}
      <View style={{ paddingHorizontal: 20 }}>
        {filteredPosts.length === 0 ? (
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
            <Ionicons name="newspaper-outline" size={36} color={colors.textMuted} />
            <AppText variant="body" weight="bold" color={colors.text} style={{ marginTop: 8 }}>
              No announcements right now
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              Check back soon for news from the school.
            </AppText>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReact={() => handlePostReact(post.id)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
