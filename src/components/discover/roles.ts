import type { Ionicons } from '@expo/vector-icons';

/** Display labels / icons for the data values used across Discover. (Moved here unchanged from the cards.) */

export const ACTOR_LABELS: Record<string, string> = {
  student: 'Student',
  guardian: 'Guardian',
  teacher: 'Teacher',
  staff: 'Staff',
  school_admin: 'School admin',
};

export const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  student: 'school',
  teacher: 'briefcase',
  staff: 'business',
  school_admin: 'star',
  guardian: 'heart',
};

export const TYPE_LABELS: Record<string, string> = {
  university: 'University',
  training_school: 'Training school',
  secondary: 'Secondary school',
};

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}
