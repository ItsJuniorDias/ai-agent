/**
 * Design system — "Daylight Navy".
 *
 * The application deliberately has one appearance: light mode. Surfaces use a
 * calm blue-white elevation ramp while navy gradients remain the signature.
 * Every screen should consume these semantic tokens rather than hardcoding UI
 * colours, so the visual language remains consistent.
 */

import { Platform } from "react-native";

/** rgba() helper so callers can tune opacity without creating new tokens. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// -- Raw palette ------------------------------------------------------------
export const Palette = {
  // Blue-tinted elevation ramp for a crisp, calm light interface.
  canvas: "#F4F7FC",
  raised: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#EAF0F8",
  surface3: "#DCE6F2",

  // Dark navy taken from the app icon, with blue-only gradient companions.
  iris: "#0A3D91",
  irisPressed: "#062B67",
  violet: "#1055AE",
  cyan: "#2878C7",

  // Light-mode semantic colours with accessible contrast.
  green: "#16803B",
  red: "#C9342C",
  orange: "#B85B00",

  white: "#FFFFFF",
  black: "#010624",
} as const;

// -- Semantic color tokens --------------------------------------------------
export const Color = {
  bg: Palette.canvas,
  bgRaised: Palette.raised,
  surface: Palette.surface,
  surface2: Palette.surface2,
  surface3: Palette.surface3,

  // Navy translucent separators work across all light surfaces.
  hairline: alpha(Palette.iris, 0.12),
  hairlineStrong: alpha(Palette.iris, 0.2),
  border: alpha(Palette.iris, 0.14),

  // Text.
  label: "#010624",
  secondary: "#30486E",
  tertiary: "#647897",
  quaternary: "#93A4BD",
  placeholder: "#647897",

  // Accent.
  accent: Palette.iris,
  accentPressed: Palette.irisPressed,
  accentSoft: alpha(Palette.iris, 0.12),
  onAccent: Palette.white,

  // Semantics.
  success: Palette.green,
  danger: Palette.red,
  warning: Palette.orange,
  successSoft: alpha(Palette.green, 0.12),
  dangerSoft: alpha(Palette.red, 0.12),
  warningSoft: alpha(Palette.orange, 0.12),

  // Navy-blue gradient stops; `violet` remains as a backwards-compatible key.
  aurora: [Palette.iris, Palette.violet, Palette.cyan] as const,
  auroraButton: [Palette.iris, "#09235A", "#174D89"] as const,
} as const;

// -- Liquid glass -----------------------------------------------------------
export const Glass = {
  tint: "light" as const,
  intensity: Platform.OS === "ios" ? 45 : 30,
  fill: [alpha(Palette.white, 0.72), alpha("#E6EFFA", 0.82)] as const,
  fillSolid: Palette.surface,
  border: alpha(Palette.iris, 0.14),
  highlight: alpha(Palette.white, 0.9),
  shadow: "#172C50",
} as const;

// -- Radius -----------------------------------------------------------------
export const Radius = {
  xs: 8, sm: 10, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999,
} as const;

// -- Spacing (4pt grid) -----------------------------------------------------
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

// -- Elevation / shadow -----------------------------------------------------
export const Shadow = {
  card: {
    shadowColor: Glass.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 18, elevation: 3,
  },
  glass: {
    shadowColor: Glass.shadow, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14, shadowRadius: 24, elevation: 7,
  },
  glow: {
    shadowColor: Palette.iris, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24, shadowRadius: 16, elevation: 6,
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
  eyebrow: { fontSize: 13, fontWeight: "600", letterSpacing: 0.6 },
} as const;

/** Brand colors retain their native appearance on the light canvas. */
export function onDarkBrand(hex: string): string {
  return hex;
}

// Backward-compatible exports. Both keys intentionally resolve to light tokens
// so legacy themed primitives cannot re-enable dark mode.
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
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const MonoFont = Platform.OS === "ios" ? "Menlo" : "monospace";
