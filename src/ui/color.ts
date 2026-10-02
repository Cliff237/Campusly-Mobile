/**
 * Tiny colour helpers for the one place where colours come from DATA instead of the theme:
 * an institution's accent. Everything else in the UI reads fixed tokens from `tokens.ts`.
 *
 * The product rule is "an institution may choose an accent, nothing else", so the accent is only
 * ever used (a) as a fill behind a monogram / logo, (b) as a tint, or (c) as text on its own tint —
 * and in every case these helpers pick a foreground that stays readable (WCAG AA) whatever
 * colour the institution chose.
 */

type RGB = [number, number, number];

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses #RGB / #RRGGBB. Returns null for anything else (null, "red", "rgb(…)"). */
export function parseHex(input: string | null | undefined): RGB | null {
  if (!input) return null;
  const m = HEX.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Valid hex accent, or the fallback. */
export function safeColor(input: string | null | undefined, fallback: string): string {
  const rgb = parseHex(input);
  return rgb ? toHex(rgb) : fallback;
}

function toHex([r, g, b]: RGB): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** `rgba()` string for a hex colour at the given opacity. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Linear blend: t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const ra = parseHex(a) ?? [0, 0, 0];
  const rb = parseHex(b) ?? [0, 0, 0];
  return toHex([ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t]);
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 … 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** White or near-black — whichever reads better on `bg`. */
export function readableOn(bg: string, light = '#FFFFFF', dark = '#1B1730'): string {
  return contrast(bg, light) >= contrast(bg, dark) ? light : dark;
}

/**
 * The accent, nudged toward black (on light surfaces) or white (on dark ones) just far enough to
 * reach `min` contrast against `surface`. Use it for accent-coloured TEXT and ICONS.
 */
export function accentInk(accent: string, surface: string, isDark: boolean, min = 4.5): string {
  const toward = isDark ? '#FFFFFF' : '#000000';
  let out = accent;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    out = mix(accent, toward, t);
    if (contrast(out, surface) >= min) return out;
  }
  return out;
}

/** The accent flattened onto `surface` at `alpha` — an opaque tint you can measure contrast against. */
export function tint(accent: string, surface: string, alpha: number): string {
  return mix(surface, accent, alpha);
}
