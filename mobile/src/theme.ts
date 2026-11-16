import { Platform } from "react-native";

/**
 * Design tokens for the Market Analysis app.
 * `colors` keeps every legacy key so existing screens keep working, while new
 * tokens (surfaces, gradients, spacing, radius, typography, elevation) power the
 * refreshed "digital" look.
 */
export const theme = {
  colors: {
    // Base canvas
    background: "#040d16",
    backgroundAlt: "#06151f",
    backgroundElevated: "#0a1c29",

    // Surfaces (cards / panels)
    panel: "#0e2432",
    panelAlt: "#143449",
    surface: "#0e2432",
    surfaceAlt: "#143449",
    surfaceGlass: "rgba(20, 52, 73, 0.55)",

    // Borders
    border: "#1d4660",
    borderStrong: "#2a6a8f",
    hairline: "rgba(130, 183, 200, 0.14)",

    // Brand accents
    accent: "#00d4a6",
    accentAlt: "#38bdf8",
    accentViolet: "#7c5cff",
    accentSoft: "rgba(0, 212, 166, 0.14)",

    // Text
    text: "#eaf8ff",
    textDim: "#b7d4e3",
    muted: "#8fb2c4",
    faint: "#5f7f91",

    // Semantic
    positive: "#34e0a1",
    negative: "#ff6b7d",
    warning: "#ffcf5c",
    info: "#5bc8ff"
  },

  /** Ordered color stops for gradient-like layering. */
  gradients: {
    hero: ["#0b2f3f", "#072230", "#05141d"] as const,
    accent: ["#00d4a6", "#1fb5c9", "#38bdf8"] as const,
    violet: ["#38bdf8", "#6c7bff", "#7c5cff"] as const,
    danger: ["#ff6b7d", "#ff4d6d"] as const
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 26,
    pill: 999
  },

  font: {
    display: 28,
    title: 20,
    heading: 17,
    body: 14,
    small: 12,
    tiny: 11,
    micro: 10
  }
};

type GlowColor = string;

/**
 * Cross-platform elevation / glow. On web this maps to a layered boxShadow; on
 * native it uses shadow* (iOS) and elevation (Android).
 */
export function elevate(level: 1 | 2 | 3 = 2, glow?: GlowColor) {
  const depth = { 1: 6, 2: 14, 3: 24 }[level];
  const opacity = { 1: 0.28, 2: 0.4, 3: 0.52 }[level];

  if (Platform.OS === "web") {
    const base = `0px ${depth / 2}px ${depth}px rgba(1, 8, 14, ${opacity})`;
    const ring = glow ? `, 0px 0px ${depth + 8}px ${withAlpha(glow, 0.35)}` : "";
    return { boxShadow: `${base}${ring}` } as const;
  }

  return {
    shadowColor: glow ?? "#000000",
    shadowOffset: { width: 0, height: depth / 2 },
    shadowOpacity: opacity,
    shadowRadius: depth,
    elevation: depth
  } as const;
}

export function withAlpha(hex: string, alpha: number) {
  if (!hex.startsWith("#")) {
    return hex;
  }
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
