/**
 * Typeface for the redesigned UI: Plus Jakarta Sans (SIL OFL — see
 * assets/fonts/OFL.txt). Five static weights are bundled (~95 KB each).
 *
 * Expo SDK 57 registers each weight under its own family name (multi-weight
 * families arrive in SDK 58), so components pick a family via `fontFamily`
 * instead of `fontWeight`.
 *
 * Loaded at runtime with `useFonts`, so adding/changing fonts never needs a
 * new native build.
 */
import { useFonts } from 'expo-font';

export const fontAssets = {
  'PlusJakartaSans-Regular': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-Medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
} as const;

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export const fontFamily: Record<FontWeight, keyof typeof fontAssets> = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extrabold: 'PlusJakartaSans-ExtraBold',
};

/** Call once in the root layout and keep the splash screen up until it resolves. */
export function useAppFonts() {
  return useFonts(fontAssets);
}
