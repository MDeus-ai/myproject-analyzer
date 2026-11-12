# ADR 005: Desktop packaging with electron-builder

## Status

Accepted (Phase 1, Step 6)

## Context

The desktop shell needed to produce a distributable Windows installer.
Constraints: the shared renderer is built by Vite; the shell loads it from
`renderer/index.html` when `app.isPackaged`; signing and auto-update are
deferred until the project has users.

## Decision

1. **electron-builder, NSIS target, Windows-first.** Per-user install
   (`perMachine: false`, no admin prompt), user-changeable install dir,
   `asar: true`, `publish: null` — artifacts are only ever uploaded as CI
   workflow artifacts, never pushed to a release provider.
2. **Renderer staged by `scripts/prepackage.mjs`**: runs the Vite production
   build, then copies `apps/web/dist` into `apps/desktop/renderer/` — the
   exact path `main.ts` already loads in packaged mode.
3. **`base: './'` for production Vite builds** so `index.html` references
   assets relatively; absolute paths break under the `file://` protocol the
   packaged app uses. Dev keeps `/`.
4. **Minimal `files` set** (`dist/`, `renderer/`, `assets/`) — sources,
   tests, and node_modules of OTHER workspaces never enter the package;
   esbuild already bundled every workspace dependency into `dist/`.
5. **CI**: a `package-windows` job (needs: verify) builds on pushes, tags,
   and manual dispatch; PRs are gated out until the first green artifact.
   Code signing is explicitly disabled in CI (`CSC_IDENTITY_AUTO_DISCOVERY:
false`). Deferred: signing ($), auto-updates (electron-updater + release
   server), macOS/Linux targets.

## Consequences

- `npm run dist:desktop` from the repo root produces
  `apps/desktop/release/MyProject Analyzer-Setup-<version>.exe`.
- The installed app and the dev app run the same code paths: same renderer
  bundle, same bundled main/preload.
- Unsigned installers show a SmartScreen warning — acceptable pre-users;
  signing is a paid, reversible follow-up.
