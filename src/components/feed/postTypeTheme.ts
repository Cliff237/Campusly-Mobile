import type { ComponentProps } from 'react';
import type { StudentPostCategory } from '@/lib/types/student';
import { mix } from '@/ui/color';

type IconName = ComponentProps<typeof import('@expo/vector-icons').Ionicons>['name'];

/**
 * Visual identity for every post type, shared by the student/teacher home feed
 * (FeedPostCard) and the public explorer feed (PostCard) so an Event always
 * *looks* like an Event everywhere in the app.
 *
 * Nothing here is functional — colours, icons and labels only. Backgrounds are
 * derived per scheme so both light and dark stay readable (AA) without
 * hand-maintaining two full palettes.
 */
export interface PostTypeTheme {
  id: StudentPostCategory;
  label: string;
  /** Overline shown in the card's top ribbon. */
  ribbon: string;
  icon: IconName;
  /** Core hue (light-mode). */
  accent: string;
  /** Same hue nudged for dark surfaces. */
  accentDark: string;
  /** Horizontal gradient for the ribbon / banners. */
  gradient: [string, string];
  /** Soft tinted background for detail blocks. Scheme-aware. */
  soft: string;
  /** Text/icon colour that reads on `soft`. Scheme-aware. */
  onSoft: string;
}

const BASE: Record<StudentPostCategory, { label: string; ribbon: string; icon: IconName; accent: string; gradient: [string, string] }> = {
  general: {
    label: 'General',
    ribbon: 'General update',
    icon: 'chatbubbles',
    accent: '#7C3AED',
    gradient: ['#8B5CF6', '#6D28D9'],
  },
  event: {
    label: 'Event',
    ribbon: 'Event',
    icon: 'calendar',
    accent: '#EA580C',
    gradient: ['#FB923C', '#EA580C'],
  },
  opportunity: {
    label: 'Opportunity',
    ribbon: 'Opportunity',
    icon: 'rocket',
    accent: '#0284C7',
    gradient: ['#38BDF8', '#0284C7'],
  },
  achievement: {
    label: 'Achievement',
    ribbon: 'Achievement',
    icon: 'trophy',
    accent: '#B45309',
    gradient: ['#FBBF24', '#B45309'],
  },
  official_announcement: {
    label: 'Official',
    ribbon: 'Official announcement',
    icon: 'megaphone',
    accent: '#C8344F',
    gradient: ['#FB7185', '#C8344F'],
  },
  partnership: {
    label: 'Partnership',
    ribbon: 'Partnership',
    icon: 'people',
    accent: '#059669',
    gradient: ['#34D399', '#059669'],
  },
  academic: {
    label: 'Academic',
    ribbon: 'Academic',
    icon: 'school',
    accent: '#2563B8',
    gradient: ['#60A5FA', '#2563B8'],
  },
};

const DARK_SURFACE = '#171229';

/** Theme for `category` on the current scheme. */
export function postTypeTheme(category: StudentPostCategory, isDark: boolean): PostTypeTheme {
  const base = BASE[category] ?? BASE.general;
  const accent = isDark ? mix(base.accent, '#FFFFFF', 0.22) : base.accent;
  return {
    id: category,
    label: base.label,
    ribbon: base.ribbon,
    icon: base.icon,
    accent: base.accent,
    accentDark: accent,
    gradient: base.gradient,
    soft: isDark ? mix(mix(base.accent, DARK_SURFACE, 0.82), DARK_SURFACE, 0.35) : mix(base.accent, '#FFFFFF', 0.9),
    onSoft: isDark ? mix(base.accent, '#FFFFFF', 0.55) : mix(base.accent, '#000000', 0.28),
  };
}

/** Short uppercase month + day for the event date badge ("OCT", "24"). */
export function monthDayBadge(value: unknown): { month: string; day: string } | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
}
