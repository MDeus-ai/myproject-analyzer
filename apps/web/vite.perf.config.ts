// TEMPORARY benchmark build config — deleted after verification.
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

export default defineConfig((env) =>
  mergeConfig((base as any)(env), {
    build: {
      outDir: ".perf-dist",
      emptyOutDir: true,
      chunkSizeWarningLimit: 100000,
      rolldownOptions: { input: "graph-perf.html" },
    },
  }),
);
