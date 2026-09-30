// src/ui/IconButton.tsx
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface IconButtonProps extends TouchableOpacityProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

export function IconButton({ name, size = 22, color, ...props }: IconButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Default color adapts to theme, but can be overridden by props
  const iconColor = color || (isDark ? '#94a3b8' : '#64748b');

  return (
    <TouchableOpacity
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
      {...props}
    >
      <Ionicons name={name} size={size} color={iconColor} />
    </TouchableOpacity>
  );
}