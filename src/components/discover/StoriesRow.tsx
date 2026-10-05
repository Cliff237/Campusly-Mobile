// components/discover/StoriesRow.tsx — "Your Campuses" redesigned
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { Membership } from '@/lib/api/discover/memberships';
import { AppText } from '@/ui/AppText';
import { InstitutionMark } from '@/ui/InstitutionMark';
import { safeColor } from '@/ui/color';
import { COLUMN, useColumnInset } from '@/ui/layout';
import { palette } from '@/ui/tokens';
import { useAppTheme } from '@/ui/useAppTheme';
import { ACTOR_LABELS, ROLE_ICONS } from './roles';

interface StoriesRowProps {
  memberships: Membership[];
  onPress: (membership: Membership) => void;
}

/** Formats long strings to guarantee 3 dots ellipsis on all devices */
function truncateWithDots(text: string, maxChars: number = 20): string {
  if (!text) return '';
  const trimmed = text.trim();
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars).trim()}...` : trimmed;
}

/** Fixed-size, modern campus pass card for horizontal scroll */
function CampusCard({
  m,
  onPress,
}: {
  m: Membership;
  onPress: (m: Membership) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const accent = safeColor(m.institution_brand_color, palette.violet[600]);
  const role = ACTOR_LABELS[m.base_actor] || m.base_actor;
  const iconName = ROLE_ICONS[m.base_actor] || 'school-outline';

  // Role tag colors
  const roleBg =
    m.base_actor === 'student'
      ? isDark
        ? 'rgba(16, 185, 129, 0.18)'
        : '#ECFDF5'
      : isDark
      ? 'rgba(127, 99, 234, 0.22)'
      : '#F3E8FF';
  const roleFg =
    m.base_actor === 'student'
      ? isDark
        ? '#34D399'
        : '#059669'
      : isDark
      ? '#A78BFA'
      : '#7C3AED';

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress(m);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${m.institution_name}, ${role}`}
      style={({ pressed }) => [
        styles.card,
        {
          width: 220,
          height: 142,
          backgroundColor: isDark ? '#18122B' : '#FFFFFF',
          borderColor: isDark ? '#2E2250' : '#E8E3F7',
          shadowColor: '#43299F',
          shadowOpacity: isDark ? 0.4 : 0.08,
          transform: [{ scale: pressed ? 0.975 : 1 }],
        },
      ]}
    >
      {/* Top accent strip in institution's brand color */}
      <View style={[styles.accentStrip, { backgroundColor: accent }]} />

      <View style={styles.cardContent}>
        {/* Top Header: Logo + Role Tag */}
        <View style={styles.topRow}>
          <InstitutionMark
            name={m.institution_name}
            color={m.institution_brand_color}
            logoUrl={m.institution_logo_url}
            size={40}
          />
          <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
            <Ionicons name={iconName} size={12} color={roleFg} />
            <AppText weight="bold" style={{ fontSize: 11, color: roleFg }}>
              {role}
            </AppText>
          </View>
        </View>

        {/* Institution Name: strictly 1 line with 3 dots ellipsis */}
        <View style={[styles.nameBlock, { width: '100%', flexShrink: 1 }]}>
          <AppText
            variant="label"
            weight="bold"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 14.5, lineHeight: 19, width: '100%' }}
          >
            {truncateWithDots(m.institution_name, 20)}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 11.5, marginTop: 2 }}>
            Campus workspace
          </AppText>
        </View>

        {/* Bottom Action Footer */}
        <View style={styles.bottomRow}>
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
            <AppText variant="caption" tone="secondary" weight="semibold" style={{ fontSize: 11 }}>
              Connected
            </AppText>
          </View>

          <View style={[styles.enterCircle, { backgroundColor: colors.brandSoft }]}>
            <Ionicons name="arrow-forward" size={13} color={colors.brand} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Featured full-width pass card when user has 1 campus */
function FeaturedCampusPass({
  m,
  onPress,
}: {
  m: Membership;
  onPress: (m: Membership) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const accent = safeColor(m.institution_brand_color, palette.violet[600]);
  const role = ACTOR_LABELS[m.base_actor] || m.base_actor;
  const iconName = ROLE_ICONS[m.base_actor] || 'school-outline';

  const roleBg =
    m.base_actor === 'student'
      ? isDark
        ? 'rgba(16, 185, 129, 0.18)'
        : '#ECFDF5'
      : isDark
      ? 'rgba(127, 99, 234, 0.22)'
      : '#F3E8FF';
  const roleFg =
    m.base_actor === 'student'
      ? isDark
        ? '#34D399'
        : '#059669'
      : isDark
      ? '#A78BFA'
      : '#7C3AED';

  return (
    <View style={[COLUMN, { paddingHorizontal: 20 }]}>
      <Pressable
        onPress={() => {
          haptics.light();
          onPress(m);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${m.institution_name}, ${role}`}
        style={({ pressed }) => [
          styles.card,
          {
            width: '100%',
            backgroundColor: isDark ? '#18122B' : '#FFFFFF',
            borderColor: isDark ? '#2E2250' : '#E8E3F7',
            shadowColor: '#43299F',
            shadowOpacity: isDark ? 0.4 : 0.08,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <View style={[styles.accentStrip, { backgroundColor: accent }]} />
        <View style={[styles.cardContent, { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }]}>
          <InstitutionMark
            name={m.institution_name}
            color={m.institution_brand_color}
            logoUrl={m.institution_logo_url}
            size={52}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText
              variant="label"
              weight="bold"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ fontSize: 15, lineHeight: 20 }}
            >
              {truncateWithDots(m.institution_name, 28)}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.roleBadge, { backgroundColor: roleBg, alignSelf: 'flex-start' }]}>
                <Ionicons name={iconName} size={11} color={roleFg} />
                <AppText weight="bold" style={{ fontSize: 11, color: roleFg }}>
                  {role}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted" style={{ fontSize: 11.5 }}>
                Tap to enter
              </AppText>
            </View>
          </View>
          <View style={[styles.enterCircle, { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandSoft }]}>
            <Ionicons name="arrow-forward" size={16} color={colors.brand} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function StoriesRow({ memberships, onPress }: StoriesRowProps) {
  const inset = useColumnInset();

  if (memberships.length === 1) {
    return <FeaturedCampusPass m={memberships[0]} onPress={onPress} />;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: inset, paddingVertical: 4, gap: 12 }}
    >
      {memberships.map((m) => (
        <CampusCard key={m.membership_id} m={m} onPress={onPress} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  accentStrip: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 13,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  nameBlock: {
    marginTop: 8,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(140, 130, 180, 0.15)',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  enterCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
