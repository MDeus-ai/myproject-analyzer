import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";

/**
 * Content Security Policy — injected as a <meta> tag at transform time, so
 * the SAME index.html serves dev and production with the right policy.
 *
 * frame-ancestors is deliberately absent: browsers ignore it inside <meta>
 * CSP. In Electron, embedding/navigation is blocked by the shell's guards
 * (main.ts); a hosted web deployment should send CSP + frame-ancestors as
 * HTTP response headers instead.
 */

const FONTS_CSS = "https://fonts.googleapis.com";
const FONTS_FILES = "https://fonts.gstatic.com";

/** Dev: permits the react-refresh inline preamble and the HMR websocket. */
const DEV_CSP = [
  `default-src 'self'`,
  // @vitejs/plugin-react injects an inline fast-refresh preamble in dev
  `script-src 'self' 'unsafe-inline'`,
  // Vite dev injects <style> tags; React style attributes need 'unsafe-inline'
  `style-src 'self' 'unsafe-inline' ${FONTS_CSS}`,
  `font-src 'self' ${FONTS_FILES} data:`,
  `img-src 'self' blob: data:`,
  // ws: covers HMR on any host the dev server is reached through (localhost or LAN IP)
  `connect-src 'self' ws: wss:`,
  `worker-src 'self' blob:`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'none'`,
].join("; ");

/** Production: no inline scripts, no websockets. Fonts stay allowlisted. */
const PROD_CSP = [
  `default-src 'self'`,
  `script-src 'self'`,
  `style-src 'self' 'unsafe-inline' ${FONTS_CSS}`,
  `font-src 'self' ${FONTS_FILES} data:`,
  `img-src 'self' blob: data:`,
  `connect-src 'self'`,
  `worker-src 'self' blob:`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'none'`,
].join("; ");

function injectCsp(content: string): Plugin {
  return {
    name: "myproject-csp",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return {
          html,
          tags: [
            {
              tag: "meta",
              attrs: { "http-equiv": "Content-Security-Policy", content },
              injectTo: "head-prepend", // CSP must precede every resource load
            },
          ],
        };
      },
    },
  };
}

export default defineConfig(({ command }) => {
  return {
    // '/' for the dev server; './' for production builds so index.html loads
    // assets via relative paths. Required for file:// loading inside the
    // packaged Electron app (absolute /assets/... paths resolve to the
    // filesystem root and the app boots to a white screen).
    base: command === "build" ? "./" : "/",
    plugins: [
      react(),
      tailwindcss(),
      injectCsp(command === "serve" ? DEV_CSP : PROD_CSP),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
