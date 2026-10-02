// components/discover/StoriesRow.tsx — "Your campuses"
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { Membership } from '@/lib/api/discover/memberships';
import { AppText } from '@/ui/AppText';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { Tag } from '@/ui/Tag';
import { safeColor } from '@/ui/color';
import { COLUMN, useColumnInset } from '@/ui/layout';
import { palette } from '@/ui/tokens';
import { useAppTheme } from '@/ui/useAppTheme';
import { ACTOR_LABELS, ROLE_ICONS } from './roles';

interface StoriesRowProps {
  memberships: Membership[];
  onPress: (membership: Membership) => void;
}

function CampusCard({ m, onPress, wide }: { m: Membership; onPress: (m: Membership) => void; wide: boolean }) {
  const { colors, shadow } = useAppTheme();
  const accent = safeColor(m.institution_brand_color, palette.violet[600]);
  const role = ACTOR_LABELS[m.base_actor] || m.base_actor;
  const icon = ROLE_ICONS[m.base_actor] || 'person';

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress(m);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${m.institution_name}, ${role}`}
      style={({ pressed }) => ({
        width: wide ? '100%' : 168,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.brandSoft : colors.surface,
        padding: 14,
        boxShadow: shadow.sm,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {wide ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <InstitutionMark name={m.institution_name} color={m.institution_brand_color} logoUrl={m.institution_logo_url} size={52} />
          <View style={{ flex: 1, gap: 8 }}>
            <AppText variant="label" weight="bold" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
              {m.institution_name}
            </AppText>
            <Tag accent={accent} icon={icon} label={role} />
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <InstitutionMark name={m.institution_name} color={m.institution_brand_color} logoUrl={m.institution_logo_url} size={48} />
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <Ionicons name="arrow-forward" size={15} color={colors.textMuted} />
            </View>
          </View>
          <AppText
            variant="label"
            weight="bold"
            numberOfLines={2}
            style={{ marginTop: 12, minHeight: 38, fontSize: 14, lineHeight: 19 }}
          >
            {m.institution_name}
          </AppText>
          <Tag accent={accent} icon={icon} label={role} style={{ marginTop: 8 }} />
        </View>
      )}
    </Pressable>
  );
}

export function StoriesRow({ memberships, onPress }: StoriesRowProps) {
  const inset = useColumnInset();

  if (memberships.length === 1) {
    return (
      <View style={[COLUMN, { paddingHorizontal: 20 }]}>
        <CampusCard m={memberships[0]} onPress={onPress} wide />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: inset, paddingVertical: 4, gap: 12 }}
    >
      {memberships.map((m) => (
        <CampusCard key={m.membership_id} m={m} onPress={onPress} wide={false} />
      ))}
    </ScrollView>
  );
}
