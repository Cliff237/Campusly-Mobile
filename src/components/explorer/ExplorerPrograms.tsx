import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EmptyState } from '@/ui/EmptyState';
import { COLUMN } from '@/ui/layout';
import { useAppTheme } from '@/ui/useAppTheme';

export function ExplorerPrograms() {
  const { colors } = useAppTheme();

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={[COLUMN, { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }]}>
      <View
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <EmptyState
          icon="library-outline"
          title="Programs coming soon"
          message="Course and program information will appear here when this institution publishes it."
        />
      </View>
    </Animated.View>
  );
}
