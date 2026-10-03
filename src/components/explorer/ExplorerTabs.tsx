// src/components/explorer/ExplorerTabs.tsx
import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { AppText } from '@/ui/AppText';
import { useAppTheme } from '@/ui/useAppTheme';

export type ExplorerSection = 'about' | 'feed' | 'programs';
export const EXPLORER_SECTIONS = ['about', 'feed', 'programs'] as const;

interface ExplorerTabsProps {
  section: ExplorerSection;
  onChange: (section: ExplorerSection) => void;
  /** Shorter rows, for the top bar that replaces the hero once it has scrolled away. */
  compact?: boolean;
}

/** About / Feed / Programs. Rendered twice on the page: in the flow, and in the top bar once it has scrolled away. */
export function ExplorerTabs({ section, onChange, compact = false }: ExplorerTabsProps) {
  const { colors } = useAppTheme();

  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row' }}>
      {EXPLORER_SECTIONS.map((item) => {
        const active = section === item;
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => { haptics.light(); onChange(item); }}
            style={({ pressed }) => ({
              flex: 1,
              height: compact ? 44 : 52,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText
              weight={active ? 'bold' : 'semibold'}
              color={active ? colors.brand : colors.textMuted}
              style={{ fontSize: 15, lineHeight: 20 }}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </AppText>
            {active ? (
              <View
                style={{ position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2, backgroundColor: colors.brand }}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
