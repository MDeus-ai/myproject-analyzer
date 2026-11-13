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

function syncThemeVariables(theme: AppTheme, isLight: boolean): void {
  const root = document.documentElement;

  const remapScaleForLight = (scale: ColorScale, themeId: string): ColorScale => {
    // Ensure solid primary buttons (bg-purple-600 text-white) always have
    // strong contrast with white text even on bright palettes (Amber, Cyan, Emerald, Graphite).
    const solidButtonShade =
      themeId === "sunset-amber" ||
      themeId === "cyber-cyan" ||
      themeId === "emerald-forest" ||
      themeId === "graphite"
        ? scale[700]
        : scale[600];

    const hoverButtonShade =
      themeId === "sunset-amber" ||
      themeId === "cyber-cyan" ||
      themeId === "emerald-forest" ||
      themeId === "graphite"
        ? scale[600]
        : scale[500];

    return {
      50: scale[950],
      100: scale[900],
      200: scale[800],
      300: scale[700],
      400: scale[600],
      500: hoverButtonShade,
      600: solidButtonShade,
      700: scale[700],
      800: scale[200],
      900: scale[100],
      950: scale[50],
    };
  };

  const primaryScale = isLight
    ? remapScaleForLight(theme.primary, theme.id)
    : theme.primary;
  const secondaryScale = isLight
    ? remapScaleForLight(theme.secondary, theme.id)
    : theme.secondary;

  for (const step of SCALE_STEPS) {
    root.style.setProperty(`--color-purple-${step}`, primaryScale[step]);
    root.style.setProperty(`--color-violet-${step}`, secondaryScale[step]);
  }

  if (isLight) {
    root.style.removeProperty("--app-bg");
  } else {
    root.style.setProperty("--app-bg", theme.appBg);
  }
}

export function applyTheme(themeId: string): void {
  const theme = getThemeById(themeId);
  const root = document.documentElement;
  const isLight = root.getAttribute("data-appearance") === "light";

  root.setAttribute("data-theme", theme.id);
  syncThemeVariables(theme, isLight);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    // Storage unavailable - theme stays session-only
  }
}

export function applyAppearance(mode: AppearanceMode): void {
  const root = document.documentElement;
  root.setAttribute("data-appearance", mode);
  const activeTheme = getThemeById(getActiveThemeId());
  syncThemeVariables(activeTheme, mode === "light");
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
 * Typography settings (Font Style & Font/Code Size scaling)
 */
export const FONT_STYLE_STORAGE_KEY = "myproject-analyzer:font-style";
export const FONT_SIZE_STORAGE_KEY = "myproject-analyzer:font-size";

export type FontStyleId =
  | "ibm-plex"
  | "plex-hybrid"
  | "condensed"
  | "mono"
  | "system";
export type FontSizeScale = "sm" | "md" | "lg" | "xl";

export interface FontStyleOption {
  id: FontStyleId;
  name: string;
  description: string;
  fontSansCss: string;
  fontDisplayCss: string;
}

export interface FontSizeOption {
  id: FontSizeScale;
  name: string;
  codePx: number;
  uiScale: number;
  badge: string;
}

export const FONT_STYLE_OPTIONS: FontStyleOption[] = [
  {
    id: "ibm-plex",
    name: "IBM Plex Sans (Default)",
    description: "Clean full-width IBM Plex Sans across headings, tables & UI",
    fontSansCss:
      '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontDisplayCss:
      '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "plex-hybrid",
    name: "IBM Plex + Condensed",
    description: "IBM Plex Sans body with condensed display headings",
    fontSansCss:
      '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontDisplayCss:
      '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif',
  },
  {
    id: "condensed",
    name: "Plex Condensed Pro",
    description: "High-density architectural condensed UI throughout",
    fontSansCss:
      '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif',
    fontDisplayCss:
      '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif',
  },
  {
    id: "mono",
    name: "IBM Plex Mono All",
    description: "Terminal-grade monospace across UI and code editors",
    fontSansCss:
      '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontDisplayCss:
      '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  {
    id: "system",
    name: "System Native UI",
    description: "Platform-native SF Pro / Segoe UI / Ubuntu sans",
    fontSansCss:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontDisplayCss:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
];

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: "sm", name: "Compact", codePx: 11, uiScale: 0.94, badge: "11px" },
  { id: "md", name: "Default", codePx: 12, uiScale: 1, badge: "12px" },
  { id: "lg", name: "Comfortable", codePx: 13.5, uiScale: 1.05, badge: "13.5px" },
  { id: "xl", name: "Large", codePx: 15, uiScale: 1.1, badge: "15px" },
];

export function getSavedFontStyle(): FontStyleId {
  try {
    const val = window.localStorage.getItem(FONT_STYLE_STORAGE_KEY);
    if (
      val === "ibm-plex" ||
      val === "plex-hybrid" ||
      val === "condensed" ||
      val === "mono" ||
      val === "system"
    ) {
      return val;
    }
  } catch {
    // ignore
  }
  return "ibm-plex";
}

export function getSavedFontSize(): FontSizeScale {
  try {
    const val = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (val === "sm" || val === "md" || val === "lg" || val === "xl") {
      return val;
    }
  } catch {
    // ignore
  }
  return "md";
}

export function applyTypographySettings(
  fontStyleId: FontStyleId,
  fontSizeScale: FontSizeScale,
): void {
  const styleOpt =
    FONT_STYLE_OPTIONS.find((o) => o.id === fontStyleId) ??
    FONT_STYLE_OPTIONS[0];
  const sizeOpt =
    FONT_SIZE_OPTIONS.find((o) => o.id === fontSizeScale) ??
    FONT_SIZE_OPTIONS[1];

  const root = document.documentElement;
  root.style.setProperty("--font-sans", styleOpt.fontSansCss);
  root.style.setProperty("--font-display", styleOpt.fontDisplayCss);
  root.style.setProperty("--code-font-size", `${sizeOpt.codePx}px`);
  root.style.setProperty("--ui-font-scale", String(sizeOpt.uiScale));
  root.setAttribute("data-font-style", styleOpt.id);
  root.setAttribute("data-font-size", sizeOpt.id);

  try {
    window.localStorage.setItem(FONT_STYLE_STORAGE_KEY, styleOpt.id);
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, sizeOpt.id);
  } catch {
    // ignore
  }
}

/**
 * Previously Loaded Projects History (persisted in localStorage for the Desktop Lobby)
 */
export const PROJECT_HISTORY_STORAGE_KEY = "myproject-analyzer:project-history:v1";

export interface CachedHistoryFile {
  name: string;
  originalPath: string;
  size: number;
  type: string;
  lastModified: number;
  content?: string;
}

export interface ProjectHistoryEntry {
  id: string;
  name: string;
  fileCount: number;
  totalSize: number;
  stackLabel: string;
  stackKind: "web" | "rust" | "cpp" | "polyglot" | "general";
  lastOpenedAt: string;
  pinned?: boolean;
  sourceKind: "sample" | "folder" | "desktop";
  sampleScenarioId?: "web" | "rust" | "cpp";
  nativeRootPath?: string;
  topExtensions: string[];
  cachedFiles?: CachedHistoryFile[];
}

const DEFAULT_SEEDED_HISTORY: ProjectHistoryEntry[] = [
  {
    id: "sample:web",
    name: "acme-saas-platform",
    fileCount: 15,
    totalSize: 24850,
    stackLabel: "Web Dev (TS/React)",
    stackKind: "web",
    lastOpenedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    pinned: true,
    sourceKind: "sample",
    sampleScenarioId: "web",
    topExtensions: [".tsx", ".ts", ".css", ".json"],
  },
  {
    id: "sample:rust",
    name: "orbit-kv-engine",
    fileCount: 7,
    totalSize: 14620,
    stackLabel: "Rust Cargo Crate",
    stackKind: "rust",
    lastOpenedAt: new Date(Date.now() - 1000 * 60 * 195).toISOString(),
    pinned: true,
    sourceKind: "sample",
    sampleScenarioId: "rust",
    topExtensions: [".rs", ".toml", ".md"],
  },
  {
    id: "sample:cpp",
    name: "chrono-physics-engine",
    fileCount: 7,
    totalSize: 15980,
    stackLabel: "C/C++ Native Engine",
    stackKind: "cpp",
    lastOpenedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    pinned: false,
    sourceKind: "sample",
    sampleScenarioId: "cpp",
    topExtensions: [".cpp", ".hpp", ".txt", ".md"],
  },
];

export function loadProjectHistory(): ProjectHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(PROJECT_HISTORY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SEEDED_HISTORY;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_SEEDED_HISTORY;
    }
    return parsed as ProjectHistoryEntry[];
  } catch {
    return DEFAULT_SEEDED_HISTORY;
  }
}

export function saveProjectHistory(entries: ProjectHistoryEntry[]): void {
  try {
    window.localStorage.setItem(
      PROJECT_HISTORY_STORAGE_KEY,
      JSON.stringify(entries.slice(0, 18)),
    );
  } catch {
    // If quota exceeded due to cachedFiles, retry without cachedFiles on older entries
    try {
      const slim = entries.slice(0, 15).map((e, idx) =>
        idx > 2 ? { ...e, cachedFiles: undefined } : e,
      );
      window.localStorage.setItem(
        PROJECT_HISTORY_STORAGE_KEY,
        JSON.stringify(slim),
      );
    } catch {
      // ignore
    }
  }
}

export function recordProjectInHistory(
  entry: Omit<ProjectHistoryEntry, "lastOpenedAt"> & { lastOpenedAt?: string },
): ProjectHistoryEntry[] {
  const current = loadProjectHistory();
  const existing = current.find(
    (item) => item.id === entry.id || item.name === entry.name,
  );
  const merged: ProjectHistoryEntry = {
    ...entry,
    pinned: entry.pinned ?? existing?.pinned ?? false,
    lastOpenedAt: entry.lastOpenedAt ?? new Date().toISOString(),
    cachedFiles: entry.cachedFiles ?? existing?.cachedFiles,
  };
  const rest = current.filter(
    (item) => item.id !== entry.id && item.name !== entry.name,
  );
  const next = [merged, ...rest].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    return (
      new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
    );
  });
  saveProjectHistory(next);
  return next;
}

export function togglePinProjectInHistory(id: string): ProjectHistoryEntry[] {
  const current = loadProjectHistory().map((item) =>
    item.id === id ? { ...item, pinned: !item.pinned } : item,
  );
  current.sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    return (
      new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
    );
  });
  saveProjectHistory(current);
  return current;
}

export function removeProjectFromHistory(id: string): ProjectHistoryEntry[] {
  const next = loadProjectHistory().filter((item) => item.id !== id);
  try {
    window.localStorage.setItem(
      PROJECT_HISTORY_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // ignore
  }
  return next;
}

export function clearProjectHistory(): ProjectHistoryEntry[] {
  try {
    window.localStorage.removeItem(PROJECT_HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
  return [];
}

/**
 * Restores the saved appearance + theme + typography. Call once before React renders.
 */
export function initializeTheme(): void {
  document.documentElement.setAttribute(
    "data-appearance",
    getSavedAppearance(),
  );
  applyTheme(getActiveThemeId());
  applyTypographySettings(getSavedFontStyle(), getSavedFontSize());
}

