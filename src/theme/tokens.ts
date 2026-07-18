/**
 * Design tokens pulled from the ShadiPlan web app (src/styles.css, hero-backdrop.tsx).
 * Hex values match hardcoded brand colors; semantic tokens map from oklch CSS variables.
 */
export const colors = {
  ivory: "#FBF7F0",
  terracotta: "#C45D3A",
  terracottaDark: "#A8482E",
  maroonDeep: "#6B2C1F",
  gold: "#F4C463",
  flame: "#DE8E2E",
  charcoal: "#3C332C",
  textMuted: "#8A7F73",
  border: "#EDE4D6",
  cream: "#FBF3EC",
  mandala: "#F4D9B8",
  gradientMid: "#D68A4A",
  destructive: "#C44A3A",
  /** oklch(0.42 0.13 25) — --primary */
  primary: "#6B2C1F",
  /** oklch(0.98 0.014 85) — --primary-foreground */
  primaryForeground: "#FBF7F0",
  /** oklch(0.24 0.014 55) — --foreground */
  foreground: "#3C332C",
  /** oklch(0.48 0.02 55) — --muted-foreground */
  mutedForeground: "#8A7F73",
  /** oklch(0.975 0.014 85) — --background */
  background: "#FBF7F0",
  /** oklch(0.99 0.008 85) — --card */
  card: "#FDFCFA",
  /** oklch(0.94 0.02 75) — --secondary */
  secondary: "#F0EBE3",
  /** oklch(0.28 0.02 45) — --secondary-foreground */
  secondaryForeground: "#4A4238",
  /** oklch(0.5 0.11 150) — --success */
  success: "#4D8B6A",
  /** oklch(0.7 0.15 65) — --warning */
  warning: "#C98A2E",
} as const;

export const fonts = {
  heading: "Fraunces",
  headingMedium: "Fraunces-Medium",
  body: "Inter",
  bodyMedium: "Inter-Medium",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  /** Matches web `px-5` screen gutter */
  screen: 20,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
} as const;

/** HeroBackdrop gradient stops — linear-gradient(160deg, ...) */
export const heroGradient = {
  colors: [colors.maroonDeep, colors.terracottaDark, colors.gradientMid] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.2, y: 0 },
  end: { x: 0.8, y: 1 },
};
