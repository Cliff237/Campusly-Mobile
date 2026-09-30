// src/components/explorer/ExplorerHero.tsx
import { View, TouchableOpacity, Image, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { ThemedText } from '@/ui/ThemedText';
import { GradientButton } from '@/ui/GradientButton';
import { haptics } from '@/lib/haptics';
import type { Institution } from '@/lib/types/explorer';

interface ExplorerHeroProps {
  institution: Institution;
  isFollowing: boolean;
  onFollow: () => void;
}

export function ExplorerHero({ institution, isFollowing, onFollow }: ExplorerHeroProps) {
  const brandColor = institution.brand_color || '#4f46e5';
  const initials = institution.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const handleShare = async () => {
    haptics.light();
    try {
      await Share.share({
        message: `Check out ${institution.name} on Campusly!`,
        url: `campusly://explorer/${institution.id}`, // Deep link
      });
    } catch (error) {
      console.error('Share failed', error);
    }
  };

  const handleWebsite = () => {
    if (institution.website) {
      haptics.light();
      Linking.openURL(institution.website);
    }
  };

  return (
    <View className="relative">
      {/* Gradient Background */}
      <View 
        className="absolute inset-0" 
        style={{ backgroundColor: `${brandColor}15` }} // 15 = ~10% opacity hex
      />
      
      <View className="p-6 pt-8 items-center">
        {/* Logo / Initials */}
        <View 
          className="w-24 h-24 rounded-3xl items-center justify-center mb-4 shadow-lg border-4 border-surface dark:border-bg-dark"
          style={{ backgroundColor: institution.logo_url ? 'transparent' : brandColor }}
        >
          {institution.logo_url ? (
            <Image source={{ uri: institution.logo_url }} className="w-full h-full rounded-2xl" resizeMode="cover" />
          ) : (
            <ThemedText variant="display" className="text-white text-3xl">{initials}</ThemedText>
          )}
        </View>

        {/* Name & Meta */}
        <ThemedText variant="heading" className="text-center text-text dark:text-text-dark mb-1" numberOfLines={2}>
          {institution.name}
        </ThemedText>
        <View className="flex-row items-center gap-1.5 mb-4">
          <Ionicons name="location" size={14} color="#64748b" />
          <ThemedText variant="muted" className="text-sm">{institution.city}, {institution.region}</ThemedText>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 w-full justify-center mb-2">
          <TouchableOpacity 
            onPress={onFollow} 
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border ${isFollowing ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'}`}
          >
            <Ionicons name={isFollowing ? 'heart' : 'heart-outline'} size={20} color={isFollowing ? '#ef4444' : '#64748b'} />
            <ThemedText variant="body" className={`font-semibold ${isFollowing ? 'text-red-500' : 'text-text dark:text-text-dark'}`}>
              {isFollowing ? 'Following' : 'Follow'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleShare}
            className="w-14 h-14 items-center justify-center rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark"
          >
            <Ionicons name="share-social-outline" size={22} color="#64748b" />
          </TouchableOpacity>

          {institution.website && (
            <TouchableOpacity 
              onPress={handleWebsite}
              className="w-14 h-14 items-center justify-center rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark"
            >
              <Ionicons name="globe-outline" size={22} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}