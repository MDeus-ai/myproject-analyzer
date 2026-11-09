import React, { useEffect, useRef, useState } from "react";
import { Palette, Check, Sun, Moon } from "lucide-react";
import {
  APP_THEMES,
  applyTheme,
  getActiveThemeId,
  applyAppearance,
  getSavedAppearance,
  swatchBackground,
  AppearanceMode,
} from "../utils/themes";

/**
 * Dropdown that lets users re-skin the whole application: light/dark
 * appearance plus one of the predefined brand color palettes.
 * Both selections are persisted to localStorage.
 */
export const ThemeSwitcher: React.FC = () => {
  const [activeThemeId, setActiveThemeId] = useState<string>(() =>
    getActiveThemeId(),
  );
  const [appearance, setAppearance] = useState<AppearanceMode>(() =>
    getSavedAppearance(),
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking anywhere outside of it
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectTheme = (themeId: string) => {
    applyTheme(themeId);
    setActiveThemeId(themeId);
  };

  const handleAppearance = (mode: AppearanceMode) => {
    applyAppearance(mode);
    setAppearance(mode);
  };

  const activeTheme =
    APP_THEMES.find((t) => t.id === activeThemeId) ?? APP_THEMES[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Change theme and appearance"
        aria-expanded={isOpen}
        className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-[var(--surface-hover)] transition-colors border border-subtle"
        title={`Theme: ${activeTheme.name} (${appearance} mode)`}
      >
        <Palette className="w-3.5 h-3.5 text-purple-400" />
        <span className="hidden sm:inline">Theme</span>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: swatchBackground(activeTheme) }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl surface-card border border-chrome shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Appearance toggle */}
          <div className="px-3 pt-3 pb-2">
            <span className="block px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Appearance
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleAppearance("light")}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  appearance === "light"
                    ? "bg-purple-600/15 border-purple-500/40 text-purple-300"
                    : "surface-raised border-chrome text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => handleAppearance("dark")}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  appearance === "dark"
                    ? "bg-purple-600/15 border-purple-500/40 text-purple-300"
                    : "surface-raised border-chrome text-slate-400 hover:text-slate-200"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Palette list */}
          <div className="px-3 pb-1 pt-1 border-t border-subtle">
            <span className="block px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 mt-1">
              Color Palette
            </span>
          </div>
          <div className="px-2 pb-2 space-y-1 max-h-72 overflow-y-auto">
            {APP_THEMES.map((theme) => {
              const isActive = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`w-full flex items-center space-x-3 p-2 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-purple-600/12 border border-purple-500/35"
                      : "border border-transparent hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-md shrink-0 border border-black/20"
                    style={{ background: swatchBackground(theme) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-semibold ${
                        isActive ? "text-purple-300" : "text-slate-200"
                      }`}
                    >
                      {theme.name}
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate">
                      {theme.description}
                    </span>
                  </span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-subtle text-[10px] text-slate-500">
            Saved automatically
          </div>
        </div>
      )}
    </div>
  );
};
