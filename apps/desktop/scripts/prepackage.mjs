/**
 * Stages the production renderer for packaging:
 *   1. vite build (apps/web)   — produces dist/ with relative base ('./')
 *   2. wipe + copy             — into apps/desktop/renderer/, where
 *                                main.ts loads it when app.isPackaged
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(here, "..");
const repoRoot = path.resolve(desktopDir, "..", "..");
const webDist = path.join(repoRoot, "apps", "web", "dist");
const rendererDir = path.join(desktopDir, "renderer");

console.log("[prepackage] building renderer (apps/web)...");
execSync("npm run build -w @myproject/web", {
  cwd: repoRoot,
  stdio: "inherit",
});

if (!existsSync(path.join(webDist, "index.html"))) {
  throw new Error(
    `[prepackage] ${webDist}\\index.html missing — build failed?`,
  );
}

console.log(`[prepackage] staging ${webDist} -> ${rendererDir}`);
rmSync(rendererDir, { recursive: true, force: true });
cpSync(webDist, rendererDir, { recursive: true });

const files = readdirSync(rendererDir);
if (!files.includes("index.html")) {
  throw new Error("[prepackage] index.html missing after copy");
}
console.log(`[prepackage] staged ${files.length} top-level entries.`);
