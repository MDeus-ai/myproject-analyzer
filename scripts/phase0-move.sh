#!/usr/bin/env bash
# Phase 0: monorepo restructuring. Run from the repo root.
# Preserves git history via git mv. Idempotent-ish (errors on re-run are harmless).
set -euo pipefail

mkdir -p packages/core/src packages/platform/src packages/platform-web/src \
         packages/ui/src apps/web/src scripts .github/workflows

# --- packages/core: pure logic modules (tests travel with their module) ---
for f in clipboard codeAnalyzer codeDiff collisionResolver depLenz fileHelpers \
         folderExclusions folderReader gitignoreParser imageExporter pdfGenerator \
         sampleProject secretsDetector smartPaste smartPasteVerify themes \
         treeBuilder zipExporter; do
  git mv "src/utils/$f.ts" "packages/core/src/$f.ts"
done
for f in codeAnalyzer codeDiff collisionResolver depLenz folderExclusions \
         folderReader smartPaste smartPasteVerify treeBuilder; do
  git mv "src/utils/$f.test.ts" "packages/core/src/$f.test.ts"
done
git mv src/types/index.ts packages/core/src/types.ts

# --- packages/ui: shared React components ---
for f in AnalyticsView AnalyzerTextPreview CodeAnalyzerView DepLenzGraphCanvas \
         DepLenzView DesktopHeader DirectoryTreeView ExclusionWarningModal \
         FilePreviewModal FlatFilesView FolderDropzone HelpShortcutsModal \
         HomePage ImportProgressOverlay PdfArchitectView PdfCanvasViewer \
         SmartPasteDiffPreview ThemeSwitcher; do
  git mv "src/components/$f.tsx" "packages/ui/src/$f.tsx"
done

# --- apps/web: the web app shell ---
git mv src/App.tsx apps/web/src/App.tsx
git mv src/main.tsx apps/web/src/main.tsx
git mv src/index.css apps/web/src/index.css
git mv index.html apps/web/index.html
git mv package.json apps/web/package.json
git mv tsconfig.json apps/web/tsconfig.json
git mv vite.config.ts apps/web/vite.config.ts
git mv .env.example apps/web/.env.example 2>/dev/null || true

rmdir src/utils src/components src/types src 2>/dev/null || true
echo "Moves complete."