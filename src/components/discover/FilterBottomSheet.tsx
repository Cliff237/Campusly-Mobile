// components/discover/FilterBottomSheet.tsx
import { Modal, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';

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

export function FilterBottomSheet({
  visible, onClose, selectedType, onSelectType, selectedCountry, onSelectCountry, countries, onApply
}: FilterBottomSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl p-6 max-h-[80%]">
          <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full self-center mb-6" />

          <View className="flex-row justify-between items-center mb-6">
            <ThemedText variant="heading" className="text-text dark:text-text-dark">Filters</ThemedText>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText variant="caption" className="mb-3 text-text-muted dark:text-text-muted-dark">Institution type</ThemedText>
            <View className="flex-row flex-wrap gap-2 mb-7">
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => { haptics.light(); onSelectType(t.value); }}
                  className={`px-4 py-2.5 rounded-xl border ${selectedType === t.value ? 'bg-accent-start/10 border-accent-start' : 'bg-transparent border-border dark:border-border-dark'}`}
                >
                  <ThemedText variant="caption" className={selectedType === t.value ? 'text-accent-start font-semibold' : 'text-text dark:text-text-dark'}>
                    {t.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText variant="caption" className="mb-3 text-text-muted dark:text-text-muted-dark">Country</ThemedText>
            <View className="gap-2 mb-8">
              <TouchableOpacity
                onPress={() => { haptics.light(); onSelectCountry('all'); }}
                className={`p-4 rounded-xl border flex-row justify-between items-center ${selectedCountry === 'all' ? 'bg-accent-start/10 border-accent-start' : 'border-border dark:border-border-dark'}`}
              >
                <ThemedText variant="body" className={selectedCountry === 'all' ? 'text-accent-start font-semibold' : 'text-text dark:text-text-dark'}>All countries</ThemedText>
                {selectedCountry === 'all' && <Ionicons name="checkmark" size={20} color="#4f46e5" />}
              </TouchableOpacity>
              {countries.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { haptics.light(); onSelectCountry(c); }}
                  className={`p-4 rounded-xl border flex-row justify-between items-center ${selectedCountry === c ? 'bg-accent-start/10 border-accent-start' : 'border-border dark:border-border-dark'}`}
                >
                  <ThemedText variant="body" className={selectedCountry === c ? 'text-accent-start font-semibold' : 'text-text dark:text-text-dark'}>{c}</ThemedText>
                  {selectedCountry === c && <Ionicons name="checkmark" size={20} color="#4f46e5" />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={() => { haptics.medium(); onApply(); }}
            className="bg-accent-start py-4 rounded-2xl items-center"
          >
            <ThemedText variant="body" className="text-white font-semibold">Apply filters</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}