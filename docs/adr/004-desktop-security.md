# ADR 004: Desktop security hardening

## Status

Accepted (Phase 1, Step 5)

## Context

Before an installer ships (Step 6), the Electron shell needed a documented,
enforced security posture. The renderer is a full web app — same code runs in
browsers — so the shell must assume it can be compromised and contain it.

## Decision

1. **Content Security Policy**, injected per-mode by Vite (`transformIndexHtml`
   in `apps/web/vite.config.ts`): strict `script-src 'self'` for production,
   a dev policy that additionally permits the react-refresh inline preamble
   (`'unsafe-inline'`) and HMR websockets (`ws:`). Both modes: `object-src
'none'`, `frame-src 'none'`, `base-uri 'self'`, `form-action 'none'`,
   Google Fonts allowlisted. `frame-ancestors` is intentionally absent from
   the meta tag (browsers ignore it there); embedding is prevented by the
   shell's navigation guards. A hosted web deployment SHOULD send CSP and
   `frame-ancestors` as HTTP response headers — headers beat meta tags.
2. **Navigation guards** in main: `will-navigate` is denied for everything
   except the dev-server origin in dev (exact origin match — `external-url.ts`
   is pure and unit-tested); `setWindowOpenHandler` only hands
   `http/https/mailto` to `shell.openExternal` and always denies the window.
3. **Deny-by-default permissions**: `setPermissionRequestHandler` and
   `setPermissionCheckHandler` both refuse everything. The app requests no
   browser permissions, so any request is suspicious by definition.
4. **No `<webview>`**: `will-attach-webview` is prevented on all webContents.
5. **Invariants preserved** (enforced by `security-invariants.test.ts` source
   scan): `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`;
   no `webSecurity: false`, no remote module; preload exposes exactly one
   global and imports no Node builtins beyond what a sandboxed preload allows.
6. **Certificate errors are NOT overridden** — Electron's default reject
   behavior stands. No `certificate-error` handler exists anywhere.

## Consequences

- A compromised renderer cannot navigate the window away, open arbitrary OS
  protocol handlers, request device permissions, attach webviews, or load
  remote scripts/styles (prod CSP).
- Dev ergonomics preserved: HMR, react-refresh, DevTools all work under the
  dev CSP.
- Trade-off: any future feature needing a browser permission, an iframe, or
  a remote script must consciously extend the policy — which is the point.
- Trade-off: Google Fonts are still fetched from the network in the packaged
  app; bundling them locally later would let `connect-src`/`style-src` drop
  the font hosts entirely.
