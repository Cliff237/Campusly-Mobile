import { Platform, Text, type TextProps, type TextStyle } from 'react-native';
import { fontFamily, type FontWeight } from './fonts';
import { typeScale, type TypeSpec, type TypeVariant } from './tokens';
import { useAppTheme } from './useAppTheme';

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'subtle'
  | 'brand'
  | 'onBrand'
  | 'danger'
  | 'success'
  | 'hero'
  | 'heroMuted';

export interface AppTextProps extends TextProps {
  /** Type-scale step. Defaults to `body`. */
  variant?: TypeVariant;
  /** Semantic colour. Defaults to `default` (primary text). */
  tone?: TextTone;
  /** Override the variant's weight. */
  weight?: FontWeight;
  align?: TextStyle['textAlign'];
  /** One-off colour escape hatch — prefer `tone`. */
  color?: string;
}

// Custom fonts on Android carry extra built-in padding that makes text look
// vertically off-centre inside buttons and inputs.
const androidMetrics: TextStyle | undefined =
  Platform.OS === 'android' ? { includeFontPadding: false } : undefined;

/**
 * Themed text. Replaces `ThemedText` on redesigned screens.
 *
 * Font scaling stays on (accessibility) but is capped so very large OS font
 * sizes can't break fixed-height controls.
 */
export function AppText({
  variant = 'body',
  tone = 'default',
  weight,
  align,
  color,
  style,
  maxFontSizeMultiplier = 1.35,
  ...rest
}: AppTextProps) {
  const { colors } = useAppTheme();
  const spec: TypeSpec = typeScale[variant];

  const toneColor: Record<TextTone, string> = {
    default: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    subtle: colors.textSubtle,
    brand: colors.brand,
    onBrand: colors.onBrand,
    danger: colors.danger,
    success: colors.success,
    hero: colors.heroText,
    heroMuted: colors.heroTextMuted,
  };

  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: fontFamily[weight ?? spec.weight],
          fontSize: spec.size,
          lineHeight: spec.line,
          letterSpacing: spec.tracking,
          color: color ?? toneColor[tone],
          textAlign: align,
          textTransform: spec.upper ? 'uppercase' : undefined,
        },
        androidMetrics,
        style,
      ]}
    />
  );
}
