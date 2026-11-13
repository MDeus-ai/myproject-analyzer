# 05 — UI Design System, Light Mode Engine & 60fps Graph Architecture

This document explains the frontend architecture, visual design system, Light/Dark contrast engineering, single-row toolbar mechanics, and 60fps SVG graph rendering in **MyProject Analyzer**.

---

## 1. Adaptive Light & Dark Mode Contrast Engine

A common pitfall in dark-first developer tools is that switching to Light Mode leaves pale pastel badges (`text-purple-300`, `text-emerald-300`, `text-amber-300`) and dark tinted pills (`bg-purple-950/40`) illegible against light backgrounds.

MyProject Analyzer solves this at two coordinated layers:

### Layer 1: Dynamic Palette Contrast Remapping (`packages/core/src/themes.ts`)
Whenever the user switches themes or toggles Light/Dark mode, `syncThemeVariables(theme, isLight)` inspects `<html data-appearance="light">`:
- **In Dark Mode**: Maps `--color-purple-50..950` directly to the palette's native stops.
- **In Light Mode**: Dynamically remaps `--color-purple-200`, `300`, and `400` to deep, high-contrast ink stops (`scale[800]`, `scale[700]`, `scale[600]`), remaps `900`/`950` badge backgrounds to soft pastel tints (`scale[100]`/`scale[50]`), and pins `--color-purple-600` (primary CTA buttons with `text-white`) to a rich, WCAG AA contrast-verified shade across all 7 palettes (`Royal Violet`, `Ocean Blue`, `Emerald Forest`, `Sunset Amber`, `Crimson Rose`, `Cyber Cyan`, `Graphite`).

### Layer 2: Global Semantic & Hue Scale Remapping (`apps/web/src/index.css`)
Under `:root[data-appearance="light"]`:
- **Crisp Alabaster & Pure White Surfaces**: `--app-bg: #f1f5f9`, `--surface-panel: #ffffff`, `--surface-card: #ffffff`, and `--surface-inset: #f1f5f9`.
- **High-Contrast Slate Text Hierarchy**: `--color-slate-50: #0f172a` (primary ink), `--color-slate-300: #334155`, `--color-slate-400: #475569`, `--color-slate-500: #475569`, and `--color-slate-600: #64748b`.
- **Secondary Hue Inversion**: All semantic Tailwind scales (`sky`, `blue`, `indigo`, `emerald`, `green`, `teal`, `cyan`, `amber`, `orange`, `rose`, `pink`, `red`) remap `200..400` to deep `800..600` ink shades and `900..950` to soft `100..50` tints so every syntax token, kind badge, and status pill stays sharp in Light Mode.

---

## 2. Single-Row Toolbar & Theme-Styled Dropdowns

### Strictly Single-Row Workspace Toolbar (`DesktopHeader.tsx`)
Instead of stacking a second row of navigation tabs below the header, `DesktopHeader.tsx` uses a `ResizeObserver` to measure available horizontal width in real time:
- At `>= 1060px`, all 6 view tabs (`Files`, `Tree`, `PDF & Image`, `Stats`, `Analyzer`, `DepLenz`) sit inline in the single `48px` (`h-12`) toolbar row.
- As the window narrows, excess tabs collapse gracefully into `ViewsOverflowDropdown` (`More (N)` / `Views`) styled identically to the Theme dropdown.

### Unified Theme-Styled Dropdowns (`ThemedDropdown.tsx`)
All native browser `<select>` elements across the entire software (`FlatFilesView`, `DepLenzView`, `DepLenzGraphCanvas`) have been replaced with `<ThemedDropdown />`, providing a consistent `surface-card` popover, `border-chrome` framing, `chip-accent` active state with `<Check />` indicator, keyboard navigation, and instant search filtering when `options.length >= 8`.

---

## 3. 60fps Direct-DOM SVG Graph Canvas (`DepLenzGraphCanvas.tsx`)

To eliminate lag and ghost/duplicate nodes when dragging boxes rapidly on large codebase graphs:
1. **Stable DOM Order**: `effNodes` is never spliced or reordered when a drag begins, ensuring the active `<g>` element is never detached and recreated mid-pointer-capture.
2. **Direct DOM Mutation During Drag**: During `pointermove`, `applyDirectNodeTransform()` mutates the dragged `<g>` element's `transform` attribute and updates only its connected `<path>` and port `<circle>` `d`/`cx`/`cy` attributes directly via `edgesByNode` inside `requestAnimationFrame` — triggering **zero React re-renders** during the drag gesture and committing `setPositions` only once on `pointerup`.
3. **GPU-Composited Pan/Zoom & Animation Pause**: Canvas pan and zoom mutate the viewport `<g>` transform directly via `requestAnimationFrame` while adding `.dlc-interacting` to pause background SVG `stroke-dashoffset` animations during active pointer movement.
