import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface ThemedDropdownOption<T extends string | number = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface ThemedDropdownProps<T extends string | number = string> {
  value: T;
  options: ThemedDropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Header title inside the popover (mirrors ThemeSwitcher's section header). */
  menuTitle?: string;
  /** Leading icon rendered inside the trigger button. */
  triggerIcon?: React.ReactNode;
  /** Optional prefix shown before the active option label in the trigger. */
  triggerPrefix?: string;
  /** Alignment of the popover relative to the trigger button. */
  align?: "left" | "right";
  /** Minimum width of the popover panel. */
  menuWidthClass?: string;
  /** Optional class applied to the trigger button. */
  triggerClassName?: string;
  /** Optional suffix control rendered inside or alongside the trigger. */
  searchableThreshold?: number;
  id?: string;
  disabled?: boolean;
}

/**
 * Bespoke dropdown menu matching the ThemeSwitcher visual language:
 * surface-card popover, rounded-2xl border-chrome, chip-accent active item,
 * optional search filter for long folder lists, and full keyboard/click-outside support.
 */
export function ThemedDropdown<T extends string | number = string>({
  value,
  options,
  onChange,
  ariaLabel,
  menuTitle,
  triggerIcon,
  triggerPrefix,
  align = "left",
  menuWidthClass = "w-64",
  triggerClassName = "",
  searchableThreshold = 8,
  id,
  disabled = false,
}: ThemedDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? options[0],
    [options, value],
  );

  const showSearch = options.length >= searchableThreshold;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)),
    );
  }, [options, showSearch, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }
    if (showSearch) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showSearch]);

  const handleSelect = (nextValue: T) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg surface-raised hover:bg-[var(--surface-raised-hover)] text-slate-200 border border-chrome font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          isOpen ? "border-accent text-accent" : ""
        } ${triggerClassName}`}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {triggerIcon && (
            <span className="text-accent shrink-0 flex items-center">
              {triggerIcon}
            </span>
          )}
          {triggerPrefix && (
            <span className="text-slate-400 shrink-0">{triggerPrefix}</span>
          )}
          <span className="truncate">{activeOption?.label ?? String(value)}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full mt-2 ${menuWidthClass} max-w-[calc(100vw-1.5rem)] rounded-2xl surface-card border border-chrome shadow-2xl shadow-black/40 z-50 overflow-hidden`}
        >
          {menuTitle && (
            <div className="px-3.5 py-2 border-b border-subtle text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {menuTitle}
            </div>
          )}

          {showSearch && (
            <div className="p-2 border-b border-subtle">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter options…"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl surface-raised border border-subtle text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "chip-accent border"
                        : "border border-transparent hover:bg-[var(--surface-hover)] text-slate-200"
                    }`}
                  >
                    <span className="flex items-start gap-2.5 min-w-0 flex-1">
                      {opt.icon && (
                        <span
                          className={`mt-0.5 shrink-0 ${
                            isSelected ? "text-accent" : "text-slate-400"
                          }`}
                        >
                          {opt.icon}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-xs font-semibold truncate ${
                            isSelected ? "text-accent" : "text-slate-200"
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.description && (
                          <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                            {opt.description}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                            isSelected
                              ? "bg-accent-soft text-accent"
                              : "surface-raised text-slate-400"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
