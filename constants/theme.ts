/**
 * Design system — "Midnight Iris".
 *
 * Everything derives from the primary color #020625 (deep indigo). The app is a
 * single, deliberately dark identity with an Apple-grade material language:
 * layered navy surfaces, hairline translucent separators, SF type, and one
 * signature — the "agent aurora" carried by the liquid-glass composer.
 *
 * Screens consume these tokens instead of hardcoding hex, so the palette lives
 * in exactly one place. `Colors`/`Fonts` are kept (and pointed at the dark
 * identity for both schemes) for backward-compat with the themed-* primitives
 * and use-theme-color.
 */

import { Platform } from "react-native";

/** rgba() helper so callers can tune opacity without new tokens. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// -- Raw palette ------------------------------------------------------------
export const Palette = {
  // Elevation ramp off the #020625 canvas.
  canvas: "#020625",
  raised: "#060B2E",
  surface: "#0C1340",
  surface2: "#131C52",
  surface3: "#1B2666",

  // Iris accent + aurora signature.
  iris: "#6E7BFF",
  irisPressed: "#5A67F0",
  violet: "#A06BFF",
  cyan: "#37D0DE",

  // Dark-tuned semantics (Apple dark variants).
  green: "#30D158",
  red: "#FF453A",
  orange: "#FF9F0A",

  white: "#FFFFFF",
  black: "#000000",
} as const;

// -- Semantic color tokens --------------------------------------------------
export const Color = {
  bg: Palette.canvas,
  bgRaised: Palette.raised,
  surface: Palette.surface,
  surface2: Palette.surface2,
  surface3: Palette.surface3,

  // Separators / borders — translucent white reads correctly over any surface.
  hairline: alpha(Palette.white, 0.09),
  hairlineStrong: alpha(Palette.white, 0.14),
  border: alpha(Palette.white, 0.1),

  // Text.
  label: "#F4F5FF",
  secondary: alpha("#F4F5FF", 0.62),
  tertiary: alpha("#F4F5FF", 0.4),
  quaternary: alpha("#F4F5FF", 0.24),
  placeholder: "#6A6F9C",

  // Accent.
  accent: Palette.iris,
  accentPressed: Palette.irisPressed,
  accentSoft: alpha(Palette.iris, 0.16),
  onAccent: Palette.white,

  // Semantics.
  success: Palette.green,
  danger: Palette.red,
  warning: Palette.orange,
  successSoft: alpha(Palette.green, 0.16),
  dangerSoft: alpha(Palette.red, 0.16),
  warningSoft: alpha(Palette.orange, 0.16),

  // Aurora gradient stops (iris → violet → cyan).
  aurora: [Palette.iris, Palette.violet, Palette.cyan] as const,
  auroraButton: [Palette.iris, "#7E74FF", "#9A6BFF"] as const,
} as const;

// -- Liquid glass -----------------------------------------------------------
export const Glass = {
  tint: "dark" as const,
  intensity: Platform.OS === "ios" ? 40 : 28,
  fill: [alpha(Palette.surface, 0.55), alpha(Palette.surface3, 0.66)] as const,
  fillSolid: Palette.surface2, // reduce-transparency fallback
  border: alpha(Palette.white, 0.14),
  highlight: alpha(Palette.white, 0.28),
  shadow: Palette.black,
} as const;

// -- Radius -----------------------------------------------------------------
export const Radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

// -- Spacing (4pt grid) -----------------------------------------------------
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// -- Elevation / shadow -----------------------------------------------------
export const Shadow = {
  card: {
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  glass: {
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 16,
  },
  glow: {
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;

// -- Type scale (SF Pro) ----------------------------------------------------
export const Type = {
  largeTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -0.6 },
  title1: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  title2: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  title3: { fontSize: 20, fontWeight: "600", letterSpacing: -0.2 },
  headline: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: "400", letterSpacing: -0.2 },
  callout: { fontSize: 16, fontWeight: "400" },
  subhead: { fontSize: 15, fontWeight: "400" },
  footnote: { fontSize: 13, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "400" },
  caption2: { fontSize: 11, fontWeight: "400" },
  // Section eyebrows (grouped-list headers).
  eyebrow: { fontSize: 13, fontWeight: "600", letterSpacing: 0.6 },
} as const;

/**
 * Brand colors remapped for legibility on the dark canvas — near-black brands
 * (GitHub, Vercel, Notion, Slack aubergine) get luminous substitutes; the rest
 * are already vivid enough on indigo.
 */
export function onDarkBrand(hex: string): string {
  const map: Record<string, string> = {
    "#181717": "#E6EDF3",
    "#000000": "#EDEEFB",
    "#24292E": "#E6EDF3",
    "#4A154B": "#CE93D8",
    "#0052CC": "#4C9AFF",
    "#6264A7": "#8B8CC7",
  };
  return map[hex.toUpperCase()] ?? map[hex] ?? hex;
}

// -- Backward-compat exports (themed-* + use-theme-color) --------------------
const scheme = {
  text: Color.label,
  background: Color.bg,
  tint: Color.accent,
  icon: Color.secondary,
  tabIconDefault: Color.tertiary,
  tabIconSelected: Color.accent,
};

export const Colors = { light: scheme, dark: scheme };

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Monospace family for payload / trace, per platform. */
export const MonoFont = Platform.OS === "ios" ? "Menlo" : "monospace";
