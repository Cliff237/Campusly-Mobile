// src/ui/ThemedCard.tsx
import { View, type ViewProps, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';

interface ThemedCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'glass';
}

export function ThemedCard({ variant = 'glass', style, children, ...props }: ThemedCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const variants = {
    default: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },
    elevated: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    glass: {
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
  };

  return (
    <View
      style={[
        styles.card,
        variants[variant],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
  },
});