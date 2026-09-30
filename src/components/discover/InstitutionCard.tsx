// components/discover/InstitutionCard.tsx
import { View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';
import { DirectoryInstitution } from '@/lib/api/discover/explorer';

interface InstitutionCardProps {
  institution: DirectoryInstitution;
  isFollowing: boolean;
  isBound: boolean;
  baseActor?: string;
  onFollow: () => void;
  onView: () => void;
}

const ACTOR_LABELS: Record<string, string> = {
  student: 'Student',
  guardian: 'Guardian',
  teacher: 'Teacher',
  staff: 'Staff',
  school_admin: 'School admin',
};

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}

export function InstitutionCard({ institution, isFollowing, isBound, baseActor, onFollow, onView }: InstitutionCardProps) {
  const brandColor = institution.brand_accent_color || '#4f46e5';
  const coverUrl = (institution as any).cover_image_url as string | undefined;
  const initials = institution.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onView}
      className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark mb-4"
    >
      {/* Cover */}
      <View className="h-28 w-full rounded-t-2xl overflow-hidden relative" style={{ backgroundColor: `${brandColor}22` }}>
        {coverUrl && <Image source={{ uri: coverUrl }} className="w-full h-full" resizeMode="cover" />}
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); haptics.light(); onFollow(); }}
          className={`absolute top-3 right-4 px-4 py-2 rounded-full ${isFollowing ? 'bg-surface-hover dark:bg-surface-hover-dark border border-border dark:border-border-dark' : 'bg-accent-start'}`}
        >
          <ThemedText
            variant="tiny"
            className={isFollowing ? 'font-semibold' : 'text-white font-semibold'}
            style={isFollowing ? { color: brandColor } : undefined}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View className="px-4 pb-4 flex-row gap-4">
        {/* Logo mark, overlapping the cover */}
        <View
          className="w-[72px] h-[72px] rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark items-center justify-center overflow-hidden"
          style={{
            marginTop: -28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          {institution.logo_url ? (
            <Image source={{ uri: institution.logo_url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <ThemedText variant="subheading" style={{ color: brandColor }}>{initials}</ThemedText>
          )}
        </View>

        {/* Content */}
        <View className="flex-1 pt-2.5">
          <View className="flex-row items-center gap-1">
            <ThemedText variant="subheading" className="text-text dark:text-text-dark" numberOfLines={1}>
              {institution.name}
            </ThemedText>
            {isBound && <Ionicons name="checkmark-circle" size={16} color={brandColor} />}
          </View>
          <ThemedText variant="caption" className="text-text-muted dark:text-text-muted-dark mt-0.5">
            {institution.city}, {institution.country}
          </ThemedText>

          {baseActor && (
            <View className="self-start flex-row items-center rounded-full bg-accent-start/10 px-2.5 py-1 mt-2">
              <Ionicons name="person-circle-outline" size={13} color={brandColor} />
              <ThemedText variant="tiny" className="text-accent-start font-semibold ml-1" numberOfLines={1}>
                {ACTOR_LABELS[baseActor] || baseActor}
              </ThemedText>
            </View>
          )}

          {/* Stats */}
          <View className="flex-row gap-6 mt-3.5">
            <View
              accessible
              accessibilityLabel={`${formatCount(institution.follower_count)} followers`}
              className="items-center justify-center"
            >
              <Ionicons name="people-outline" size={17} color="#0284c7" />
              <ThemedText variant="tiny" className="text-sky-700 dark:text-sky-300 font-bold mt-1">
                {formatCount(institution.follower_count)}
              </ThemedText>
            </View>
            <View
              accessible
              accessibilityLabel={`${formatCount(institution.post_count ?? institution.public_post_count ?? 0)} posts`}
              className="items-center justify-center"
            >
              <Ionicons name="newspaper-outline" size={17} color="#059669" />
              <ThemedText variant="tiny" className="text-emerald-700 dark:text-emerald-300 font-bold mt-1">
                {formatCount(institution.post_count ?? institution.public_post_count ?? 0)}
              </ThemedText>
            </View>
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
}