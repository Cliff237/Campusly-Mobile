import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';

/** Small soft chip used for post tags / scope / course badges. */
export function TintChip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
      <AppText weight="semibold" color={color} style={{ fontSize: 11.5, lineHeight: 14 }}>
        {label}
      </AppText>
    </View>
  );
}

/** Icon + label row inside a post type's detail panel. */
export function DetailRow({ icon, text, color, bg }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string; bg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <AppText variant="caption" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
