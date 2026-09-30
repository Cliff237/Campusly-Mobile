// components/discover/StoriesRow.tsx
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import type { Membership } from '@/lib/api/discover/memberships';
import { haptics } from '@/lib/haptics';

interface StoriesRowProps {
  memberships: Membership[];
  onPress: (membership: Membership) => void;
}

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  student: 'school',
  teacher: 'briefcase',
  staff: 'business',
  school_admin: 'star',
  guardian: 'heart',
};

export function StoriesRow({ memberships, onPress }: StoriesRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 20, paddingRight: 4, gap: 18 }}
    >
      {memberships.map((m) => {
        const brandColor = m.institution_brand_color || '#4f46e5';
        const initials = m.institution_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const roleIcon = ROLE_ICONS[m.base_actor] || 'person';

        return (
          <TouchableOpacity
            key={m.membership_id}
            activeOpacity={0.8}
            onPress={() => { haptics.light(); onPress(m); }}
            className="items-center"
            style={{ width: 68 }}
          >
            <View className="relative">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ borderWidth: 2, borderColor: brandColor }}
              >
                <View className="w-[54px] h-[54px] rounded-full items-center justify-center overflow-hidden bg-surface-hover dark:bg-surface-hover-dark">
                  {m.institution_logo_url ? (
                    <Image source={{ uri: m.institution_logo_url }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <ThemedText variant="body" className="text-text dark:text-text-dark font-semibold">
                      {initials}
                    </ThemedText>
                  )}
                </View>
              </View>
              <View
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full items-center justify-center border-2 border-bg dark:border-bg-dark"
                style={{ backgroundColor: brandColor }}
              >
                <Ionicons name={roleIcon} size={10} color="#ffffff" />
              </View>
            </View>
            <ThemedText variant="tiny" className="text-center text-text dark:text-text-dark mt-1.5" numberOfLines={1}>
              {m.institution_name.split(' ')[0]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
