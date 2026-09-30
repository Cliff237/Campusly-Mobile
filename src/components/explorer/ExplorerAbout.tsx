// src/components/explorer/ExplorerAbout.tsx
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import type { SchoolInfo, InstitutionCategory } from '@/lib/types/explorer';
import { CATEGORY_LABELS } from '@/lib/types/explorer';

interface ExplorerAboutProps {
  description: string;
  schoolInfo: SchoolInfo | null;
  category: InstitutionCategory;
}

export function ExplorerAbout({ description, schoolInfo, category }: ExplorerAboutProps) {
  return (
    <View className="px-5 py-6">
      <ThemedText variant="subheading" className="text-text dark:text-text-dark mb-4">About</ThemedText>
      
      <ThemedText variant="body" className="text-text-muted dark:text-text-muted-dark leading-6 mb-6">
        {description || schoolInfo?.about || 'No description available.'}
      </ThemedText>

      <View className="bg-surface-hover dark:bg-surface-hover-dark rounded-2xl p-4 gap-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-accent-start/10 items-center justify-center">
            <Ionicons name="school-outline" size={20} color="#4f46e5" />
          </View>
          <View>
            <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Type</ThemedText>
            <ThemedText variant="body" className="text-text dark:text-text-dark font-semibold">
              {CATEGORY_LABELS[category] || category}
            </ThemedText>
          </View>
        </View>

        {schoolInfo?.founded_year && (
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-accent-start/10 items-center justify-center">
              <Ionicons name="time-outline" size={20} color="#4f46e5" />
            </View>
            <View>
              <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Founded</ThemedText>
              <ThemedText variant="body" className="text-text dark:text-text-dark font-semibold">
                {schoolInfo.founded_year}
              </ThemedText>
            </View>
          </View>
        )}

        {schoolInfo?.contact_email && (
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-accent-start/10 items-center justify-center">
              <Ionicons name="mail-outline" size={20} color="#4f46e5" />
            </View>
            <View className="flex-1">
              <ThemedText variant="tiny" className="text-text-muted dark:text-text-muted-dark">Email</ThemedText>
              <ThemedText variant="body" className="text-text dark:text-text-dark font-semibold" numberOfLines={1}>
                {schoolInfo.contact_email}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}