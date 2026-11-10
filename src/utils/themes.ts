/**
 * Theme engine for MyProject Analyzer.
 *
 * Every theme maps BOTH the --color-purple-* and --color-violet-* scales to
 * the same hue family (usually the exact same scale). The app builds its
 * brand accents from those two variables, so a theme is always tone-on-tone
 * and two themes can never clash with each other.
 *
 * Light/dark appearance is handled separately: `applyAppearance` only toggles
 * the `data-appearance` attribute; the slate-scale inversion and surface
 * colors live in src/index.css.
 */

export const THEME_STORAGE_KEY = "myproject-analyzer:theme";
export const APPEARANCE_STORAGE_KEY = "myproject-analyzer:appearance";

export type AppearanceMode = "dark" | "light";

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  /** Swatch stops. Identical stops render as a solid swatch (no gradient). */
  preview: [string, string];
  /** Applied to every --color-purple-* variable (primary brand scale). */
  primary: ColorScale;
  /** Applied to every --color-violet-* variable (secondary gradient scale). */
  secondary: ColorScale;
  /** Neutral dark background with a faint hue tint, applied in dark mode. */
  appBg: string;
}

/* ------------------------------------------------------------------ */
/* Raw Tailwind palette scales (hex equivalents)                       */
/* ------------------------------------------------------------------ */

const VIOLET: ColorScale = {
  50: "#f5f3ff",
  100: "#ede9fe",
  200: "#ddd6fe",
  300: "#c4b5fd",
  400: "#a78bfa",
  500: "#8b5cf6",
  600: "#7c3aed",
  700: "#6d28d9",
  800: "#5b21b6",
  900: "#4c1d95",
  950: "#2e1065",
};

const BLUE: ColorScale = {
  50: "#eff6ff",
  100: "#dbeafe",
  200: "#bfdbfe",
  300: "#93c5fd",
  400: "#60a5fa",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
  800: "#1e40af",
  900: "#1e3a8a",
  950: "#172554",
};

const SKY: ColorScale = {
  50: "#f0f9ff",
  100: "#e0f2fe",
  200: "#bae6fd",
  300: "#7dd3fc",
  400: "#38bdf8",
  500: "#0ea5e9",
  600: "#0284c7",
  700: "#0369a1",
  800: "#075985",
  900: "#0c4a6e",
  950: "#082f49",
};

const EMERALD: ColorScale = {
  50: "#ecfdf5",
  100: "#d1fae5",
  200: "#a7f3d0",
  300: "#6ee7b7",
  400: "#34d399",
  500: "#10b981",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
  900: "#064e3b",
  950: "#022c22",
};

const AMBER: ColorScale = {
  50: "#fffbeb",
  100: "#fef3c7",
  200: "#fde68a",
  300: "#fcd34d",
  400: "#fbbf24",
  500: "#f59e0b",
  600: "#d97706",
  700: "#b45309",
  800: "#92400e",
  900: "#78350f",
  950: "#451a03",
};

const ROSE: ColorScale = {
  50: "#fff1f2",
  100: "#ffe4e6",
  200: "#fecdd3",
  300: "#fda4af",
  400: "#fb7185",
  500: "#f43f5e",
  600: "#e11d48",
  700: "#be123c",
  800: "#9f1239",
  900: "#881337",
  950: "#4c0519",
};

const CYAN: ColorScale = {
  50: "#ecfeff",
  100: "#cffafe",
  200: "#a5f3fc",
  300: "#67e8f9",
  400: "#22d3ee",
  500: "#06b6d4",
  600: "#0891b2",
  700: "#0e7490",
  800: "#155e75",
  900: "#164e63",
  950: "#083344",
};

const SLATE: ColorScale = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
};

/* ------------------------------------------------------------------ */
/* Theme registry - cohesive, mono-hue, solid swatches                 */
/* ------------------------------------------------------------------ */

export const APP_THEMES: AppTheme[] = [
  {
    id: "royal-violet",
    name: "Royal Violet",
    description: "Classic violet accent",
    preview: ["#8b5cf6", "#8b5cf6"],
    primary: VIOLET,
    secondary: VIOLET,
    appBg: "#0f0e14",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Blue with subtle sky depth",
    preview: ["#3b82f6", "#3b82f6"],
    primary: BLUE,
    secondary: SKY,
    appBg: "#0d1117",
  },
  {
    id: "emerald-forest",
    name: "Emerald Forest",
    description: "Solid emerald identity",
    preview: ["#10b981", "#10b981"],
    primary: EMERALD,
    secondary: EMERALD,
    appBg: "#0d1210",
  },
  {
    id: "sunset-amber",
    name: "Sunset Amber",
    description: "Warm solid amber",
    preview: ["#f59e0b", "#f59e0b"],
    primary: AMBER,
    secondary: AMBER,
    appBg: "#120f0a",
  },
  {
    id: "crimson-rose",
    name: "Crimson Rose",
    description: "Bold solid rose",
    preview: ["#f43f5e", "#f43f5e"],
    primary: ROSE,
    secondary: ROSE,
    appBg: "#130e11",
  },
  {
    id: "cyber-cyan",
    name: "Cyber Cyan",
    description: "Electric solid cyan",
    preview: ["#06b6d4", "#06b6d4"],
    primary: CYAN,
    secondary: CYAN,
    appBg: "#0c1114",
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Neutral monochrome accent",
    preview: ["#64748b", "#64748b"],
    primary: SLATE,
    secondary: SLATE,
    appBg: "#0e0f11",
  },
];

export const DEFAULT_THEME_ID = "royal-violet";

const SCALE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export function getThemeById(themeId: string): AppTheme {
  return APP_THEMES.find((theme) => theme.id === themeId) ?? APP_THEMES[0];
}

/** CSS background for a swatch: solid when both stops are identical. */
export function swatchBackground(theme: AppTheme): string {
  return theme.preview[0] === theme.preview[1]
    ? theme.preview[0]
    : `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})`;
}

function syncAppBg(): void {
  const root = document.documentElement;
  const isLight = root.getAttribute("data-appearance") === "light";
  if (isLight) {
    // Light value comes from the stylesheet rule.
    root.style.removeProperty("000000");
  } else {
    root.style.setProperty("000000", getThemeById(getActiveThemeId()).appBg);
  }
}

export function applyTheme(themeId: string): void {
  const theme = getThemeById(themeId);
  const root = document.documentElement;

  for (const step of SCALE_STEPS) {
    root.style.setProperty(`--color-purple-${step}`, theme.primary[step]);
    root.style.setProperty(`--color-violet-${step}`, theme.secondary[step]);
  }

  root.setAttribute("data-theme", theme.id);
  syncAppBg();

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    // Storage unavailable - theme stays session-only
  }
}

export function applyAppearance(mode: AppearanceMode): void {
  document.documentElement.setAttribute("data-appearance", mode);
  syncAppBg();
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function getActiveThemeId(): string {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function getSavedAppearance(): AppearanceMode {
  try {
    return window.localStorage.getItem(APPEARANCE_STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Restores the saved appearance + theme. Call once before React renders.
 */
export function initializeTheme(): void {
  document.documentElement.setAttribute(
    "data-appearance",
    getSavedAppearance(),
  );
  applyTheme(getActiveThemeId());
}
