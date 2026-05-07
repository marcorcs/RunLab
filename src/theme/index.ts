export const colors = {
  // Backgrounds
  bg: "#0A0A0F",
  surface: "#13131A",
  card: "#1A1A24",
  cardHover: "#1F1F2E",

  // Brand
  accent: "#2D6FE8",
  accentSoft: "#4A85F0",
  accentGlow: "rgba(45, 111, 232, 0.15)",
  accentBorder: "rgba(45, 111, 232, 0.3)",

  // Semantic
  success: "#1DDB8B",
  successGlow: "rgba(29, 219, 139, 0.15)",
  warning: "#FFB800",
  error: "#FF3B5C",

  // Text
  text: "#F0EEE8",
  textSecondary: "#A0A0B0",
  muted: "#6B6A7A",

  // Borders
  border: "#2A2A38",
  borderLight: "#333345",

  // Workout types
  workoutEasy: "#1DDB8B",
  workoutTempo: "#FFB800",
  workoutIntervals: "#2D6FE8",
  workoutLong: "#6C63FF",
  workoutRest: "#2A2A38",
  workoutStrength: "#00BCD4",

  // Strava brand color
  strava: "#FC4C02",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  fontDisplay: undefined,
  fontBody: undefined,

  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 36,
  },

  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
    black: "900" as const,
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;