import { useWindowDimensions } from 'react-native';

/** Keeps content readable on tablets / wide web windows; has no effect on phones. */
export const COLUMN = { width: '100%', maxWidth: 640, alignSelf: 'center' } as const;

/**
 * Horizontal padding that makes a full-bleed horizontal scroller start exactly where `COLUMN` content
 * starts (20 pt on phones, further in on wide screens), while still letting it scroll to the screen edge.
 */
export function useColumnInset(): number {
  const { width } = useWindowDimensions();
  return Math.max(20, (width - COLUMN.maxWidth) / 2 + 20);
}
