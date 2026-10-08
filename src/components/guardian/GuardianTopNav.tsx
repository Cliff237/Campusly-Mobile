// src/components/guardian/GuardianTopNav.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { AppText } from '@/ui/AppText';
import { BrandLockup } from '@/ui/brand/BrandLockup';
import { useAppTheme } from '@/ui/useAppTheme';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth/AuthContext';
import { InstitutionMark } from '@/ui/InstitutionMark';
import type { LinkedStudent } from '@/lib/api/guardian';

interface GuardianTopNavProps {
  currentStudent?: LinkedStudent | null;
  linkedStudents?: LinkedStudent[];
  onSelectStudent?: (student: LinkedStudent) => void;
  unreadCount?: number;
}

export function GuardianTopNav({
  currentStudent,
  linkedStudents = [],
  onSelectStudent,
  unreadCount = 0,
}: GuardianTopNavProps) {
  const router = useRouter();
  const { currentMembership, selectedInstitutionId } = useAuth();
  const { colors } = useAppTheme();

  const institutionId = currentMembership?.institution_id || selectedInstitutionId;
  const institutionName = currentMembership?.institution_name || 'Institution';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <BrandLockup tone="default" markSize={32} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Linked Child Selector (if student is linked) */}
        {currentStudent ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Selected student: ${currentStudent.full_name}`}
            onPress={() => {
              haptics.selection();
              if (linkedStudents.length > 1 && onSelectStudent) {
                // Find next student in cycle
                const currentIndex = linkedStudents.findIndex(
                  (s) => s.membership_id === currentStudent.membership_id,
                );
                const nextStudent =
                  linkedStudents[(currentIndex + 1) % linkedStudents.length];
                onSelectStudent(nextStudent);
              }
            }}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 18,
              backgroundColor: colors.brandSoft,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person" size={13} color="#ffffff" />
            </View>
            <AppText
              variant="caption"
              weight="bold"
              color={colors.brand}
              numberOfLines={1}
              style={{ maxWidth: 95 }}
            >
              {currentStudent.full_name.split(' ')[0]}
            </AppText>
            {linkedStudents.length > 1 ? (
              <Ionicons name="swap-horizontal" size={13} color={colors.brand} />
            ) : null}
          </TouchableOpacity>
        ) : null}

        {/* Selected Institution Profile Button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${institutionName} Profile`}
          onPress={() => {
            haptics.light();
            if (institutionId) {
              router.push(href(`/institution/${institutionId}`));
            }
          }}
          activeOpacity={0.75}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <InstitutionMark
            logoUrl={currentMembership?.institution_logo_url}
            name={institutionName}
            color={currentMembership?.institution_brand_color}
            size={38}
          />
        </TouchableOpacity>

        {/* Back to Discover hub button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Campuses Directory"
          onPress={() => {
            haptics.light();
            router.replace('/(tabs)/discover');
          }}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="grid-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
