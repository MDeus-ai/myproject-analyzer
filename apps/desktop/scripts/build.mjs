/**
 * Bundles the Electron processes:
 *   main    -> dist/main.mjs    (ESM, supported since Electron 28)
 *   preload -> dist/preload.cjs (CJS — required for sandboxed preloads)
 * electron is external: provided by the runtime, never bundled.
 */
import { build } from "esbuild";

const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
  sourcemap: true,
  external: ["electron"],
  outdir: "dist",
};

await build({
  ...shared,
  entryPoints: ["src/main.ts"],
  format: "esm",
  outExtension: { ".js": ".mjs" },
});

await build({
  ...shared,
  entryPoints: ["src/preload.ts"],
  format: "cjs",
  outExtension: { ".js": ".cjs" },
});

console.log("desktop: main + preload bundled to dist/");
