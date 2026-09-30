// src/components/auth/AuthBackground.tsx
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

export function AuthBackground() {
  const { isDark } = useTheme();

  return (
    <View className="absolute inset-0" pointerEvents="none">
      {/* Main gradient background */}
      <LinearGradient
        colors={isDark ? ['#070a12', '#111827'] : ['#f8fafc', '#e0e7ff']}
        className="absolute inset-0"
        style={{ opacity: 0.6 }}
      />
      
      {/* Soft gradient blobs for visual interest */}
      <View 
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
        style={{
          backgroundColor: isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.08)',
          shadowColor: '#4f46e5',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 100,
        }}
      />
      <View 
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full"
        style={{
          backgroundColor: isDark ? 'rgba(124, 58, 237, 0.13)' : 'rgba(124, 58, 237, 0.06)',
          shadowColor: '#7c3aed',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 100,
        }}
      />
    </View>
  );
}