// components/discover/FilterBottomSheet.tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { AppText } from '@/ui/AppText';
import { GradientButton } from '@/ui/GradientButton';
import { Chip } from '@/ui/Chip';
import { Sheet } from '@/ui/Sheet';
import { useAppTheme } from '@/ui/useAppTheme';

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  selectedCountry: string;
  onSelectCountry: (country: string) => void;
  countries: string[];
  onApply: () => void;
}

const TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'university', label: 'University' },
  { value: 'training_school', label: 'Training school' },
  { value: 'secondary', label: 'Secondary school' },
];

/** One selectable row of the country list. */
function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: selected ? colors.brand : colors.border,
        backgroundColor: selected ? colors.brandSoft : pressed ? colors.surfaceMuted : 'transparent',
      })}
    >
      <AppText weight={selected ? 'bold' : 'medium'} tone={selected ? 'default' : 'secondary'} style={{ fontSize: 15.5 }}>
        {label}
      </AppText>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.borderStrong,
          backgroundColor: selected ? colors.brand : 'transparent',
        }}
      >
        {selected ? <Ionicons name="checkmark" size={15} color={colors.onBrand} /> : null}
      </View>
    </Pressable>
  );
}

export function FilterBottomSheet({
  visible, onClose, selectedType, onSelectType, selectedCountry, onSelectCountry, countries, onApply
}: FilterBottomSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      scroll
      footer={
        <GradientButton
          title="Apply filters"
          onPress={() => { haptics.medium(); onApply(); }}
          size="lg"
        />
      }
    >
      <AppText variant="label" tone="secondary" style={{ marginBottom: 12 }}>Institution type</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={selectedType === t.value}
            onPress={() => { haptics.light(); onSelectType(t.value); }}
          />
        ))}
      </View>

      <AppText variant="label" tone="secondary" style={{ marginBottom: 12 }}>Country</AppText>
      <View style={{ gap: 8, marginBottom: 8 }} accessibilityRole="radiogroup">
        <OptionRow
          label="All countries"
          selected={selectedCountry === 'all'}
          onPress={() => { haptics.light(); onSelectCountry('all'); }}
        />
        {countries.map((c) => (
          <OptionRow
            key={c}
            label={c}
            selected={selectedCountry === c}
            onPress={() => { haptics.light(); onSelectCountry(c); }}
          />
        ))}
      </View>
    </Sheet>
  );
}
