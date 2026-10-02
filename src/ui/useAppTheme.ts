import { useColorScheme } from 'nativewind';
import { darkTheme, lightTheme, type AppTheme } from './tokens';

/**
 * Resolved theme for the current colour scheme.
 *
 * Uses NativeWind's `useColorScheme` on purpose: the Profile screen's
 * Light / Dark / System switch drives that store, so the redesigned screens
 * follow it exactly like the rest of the app does.
 */
export function useAppTheme(): AppTheme {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
