// src/components/explorer/ExplorerAbout.tsx
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import type { SchoolInfo, InstitutionCategory } from '@/lib/types/explorer';
import { CATEGORY_LABELS } from '@/lib/types/explorer';
import { AppText } from '@/ui/AppText';
import { COLUMN } from '@/ui/layout';
import { useAppTheme } from '@/ui/useAppTheme';

interface ExplorerAboutProps {
  description: string;
  schoolInfo: SchoolInfo | null;
  category: InstitutionCategory;
}

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string };

export function ExplorerAbout({ description, schoolInfo, category }: ExplorerAboutProps) {
  const { colors } = useAppTheme();

  const rows: Row[] = [{ icon: 'school-outline', label: 'Type', value: CATEGORY_LABELS[category] || category }];
  if (schoolInfo?.founded_year) rows.push({ icon: 'time-outline', label: 'Founded', value: String(schoolInfo.founded_year) });
  if (schoolInfo?.contact_email) rows.push({ icon: 'mail-outline', label: 'Email', value: schoolInfo.contact_email });

  return (
    <View style={[COLUMN, { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }]}>
      <View
        style={{
          padding: 18,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <AppText variant="bodyLg" tone="secondary" style={{ lineHeight: 26 }}>
          {description || schoolInfo?.about || 'No description available.'}
        </AppText>
      </View>

      <AppText variant="subheading" style={{ marginTop: 28, marginBottom: 12 }}>Details</AppText>
      <View
        style={{
          paddingHorizontal: 16,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        {rows.map((r, i) => (
          <View
            key={r.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.border,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.brandSoft,
              }}
            >
              <Ionicons name={r.icon} size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="muted">{r.label}</AppText>
              <AppText variant="label" weight="bold" numberOfLines={1} style={{ fontSize: 15 }}>{r.value}</AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
