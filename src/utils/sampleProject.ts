/**
 * Sample & test-scenario project generator.
 *
 * DESIGN NOTE: scenarios are built as REAL File objects (with
 * webkitRelativePath set, exactly like a drag-and-drop import produces)
 * and loaded through processFileList() — the same production reader that
 * real folder imports use. This is what makes them genuine tests:
 *
 *  - Fix 1 (broader text reading) lives in folderReader.ts. If samples
 *    handed the app pre-built ProcessedFile objects with textContent
 *    already filled in, the reader would never run and the fix would be
 *    invisible — every scenario would "pass" even with the old code.
 *  - Fix 2 (honest skip messages) only appears when textContent is
 *    genuinely absent, which only the real reader can produce.
 *  - Scenario files use type: "" wherever a real browser would report an
 *    empty MIME type (.env.example, .go, .rs, dotfiles...). Using
 *    "text/plain" would let the pre-fix reader pass, proving nothing.
 */

interface SampleTemplateFile {
  relativePath: string;
  content: string;
  type: string;
  /** Raw bytes for binary files (content is ignored when set). */
  binary?: Uint8Array;
}

/* ------------------------------------------------------------------ */
/* Scenario registry                                                    */
/* ------------------------------------------------------------------ */

export type SampleScenarioId =
  | "clean"
  | "heavy"
  | "formats"
  | "gitignore"
  | "secrets"
  | "limits"
  | "collisions";

export interface SampleScenarioMeta {
  id: SampleScenarioId;
  label: string;
  verifies: string;
  /** What a correct run should show — displayed as a tooltip checklist. */
  expected: string[];
}

export const SAMPLE_SCENARIOS: SampleScenarioMeta[] = [
  {
    id: "clean",
    label: "Clean Demo",
    verifies: "Baseline: normal project, all views work",
    expected: [
      "24 files imported",
      "No exclusion modal",
      "No secrets banner",
      "All views (Files/Tree/PDF/Stats/Analyzer) render",
    ],
  },
  {
    id: "heavy",
    label: "Heavy Folders",
    verifies: "node_modules/.git/dist exclusion modal",
    expected: [
      "Exclusion modal appears listing node_modules, .git, dist",
      "Confirming imports 24 clean files",
      '"Include heavy folders anyway" imports all 32',
      "Re-included heavy files get their text read (no false 'binary' placeholders)",
    ],
  },
  {
    id: "formats",
    label: "Format Coverage",
    verifies:
      "Fix 1: .env.example, .jsx, .yml, .go, .rs, .sql, .toml, .vue, dotfiles all readable",
    expected: [
      "All 16 files show real line counts in the Analyzer",
      ".env.example shows its 3 lines (the original bug)",
      ".gitignore, Dockerfile, Makefile, LICENSE, .jsx, .vue, .yml, .go, .rs, .sql, .toml all preview with content",
      "Every file uses type: '' like a real browser import, so this scenario FAILS on the pre-fix reader",
      'Export Standard format → zero "(Binary content...)" placeholders',
    ],
  },
  {
    id: "gitignore",
    label: "Custom .gitignore",
    verifies: "Fix 3: custom rules, wildcards, git-accurate negation",
    expected: [
      "Review modal lists every .gitignore rule group with its files: logs/, temp/*, *.dat, /build-output/, secret-*",
      "With rules respected (default): 4 files remain — .gitignore, important.dat, App.tsx, README.md",
      "important.dat SURVIVES: temp/* excludes the dir's contents, !important.dat re-includes it",
      "Unchecking a rule group re-includes its files — nothing is removed silently",
      "None of these rules exist in the hardcoded exclusion list — only .gitignore parsing can exclude them",
    ],
  },
  {
    id: "secrets",
    label: "Secrets Warning",
    verifies: "Fix 4: .env* flagged, .env.example not",
    expected: [
      "Rose banner lists .env, .env.local, .env.production, credentials.json",
      ".env.example is NOT flagged",
      'Analyzer tab: secret files get a rose highlight + "secrets?" tag',
      "Deselecting secret files in the Analyzer removes the banner",
    ],
  },
  {
    id: "limits",
    label: "Size & Binary Limits",
    verifies: "Fix 2: honest skip messages for 600KB, empty, binary files",
    expected: [
      'huge-dump.txt: "(Skipped: file is 600 KB, over the 512 KB text read limit)"',
      'empty.txt: "(File is empty)"',
      'logo.png: "(Binary content — not readable as text)"',
      "index.ts previews normally with real content",
      "Messages appear in the copied/downloaded export too, not just the preview",
    ],
  },
  {
    id: "collisions",
    label: "Collision Stress",
    verifies: "Duplicate names across 4 dirs, all strategies",
    expected: [
      "4 collisions detected badge (3 extra notes.txt + 1 extra App.tsx)",
      "Auto-number: notes.txt, notes (1-3).txt, App.tsx, App (1).tsx",
      "Prefix-path: docs_notes.txt, src_notes.txt, web_App.tsx, ...",
      "Overwrite: 7 → 3 files (notes.txt, App.tsx, unique.md)",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* File object builder — mirrors what drag-and-drop produces           */
/* ------------------------------------------------------------------ */

function toFile(def: SampleTemplateFile, index: number): File {
  const segments = def.relativePath.split("/");
  const name = segments[segments.length - 1];
  const blobPart: BlobPart = def.binary
    ? (def.binary as BlobPart)
    : def.content;
  const file = new File([blobPart], name, {
    type: def.type,
    lastModified: Date.now() - index * 3600000,
  });
  // Real folder imports get webkitRelativePath from the browser;
  // we define it the same way readDroppedEntries does.
  Object.defineProperty(file, "webkitRelativePath", {
    value: def.relativePath,
    writable: false,
  });
  return file;
}

/* ------------------------------------------------------------------ */
/* Clean demo + heavy demo (original data, now File-based)             */
/* ------------------------------------------------------------------ */

const sampleFilesData: SampleTemplateFile[] = [
  {
    relativePath: "acme-saas-platform/README.md",
    content:
      "# Acme SaaS Platform\n\nA full-stack cloud enterprise platform.\n\n## Quickstart\nRun `npm install` and `npm start`.",
    type: "text/markdown",
  },
  {
    relativePath: "acme-saas-platform/package.json",
    content:
      '{\n  "name": "acme-saas",\n  "version": "2.4.0",\n  "dependencies": {\n    "react": "^19.0.0"\n  }\n}',
    type: "application/json",
  },
  {
    // Real browsers report "" for .env.example
    relativePath: "acme-saas-platform/.env.example",
    content:
      "PORT=3000\nDATABASE_URL=postgres://localhost:5432/acmedb\nAPI_SECRET=change_me",
    type: "",
  },
  {
    relativePath: "acme-saas-platform/docs/architecture.md",
    content:
      "# Architecture Overview\nMicroservices with event-driven message bus and Postgres storage.",
    type: "text/markdown",
  },
  {
    relativePath: "acme-saas-platform/docs/api/endpoints.json",
    content:
      '[\n  { "path": "/api/users", "method": "GET" },\n  { "path": "/api/auth/login", "method": "POST" }\n]',
    type: "application/json",
  },
  {
    relativePath: "acme-saas-platform/docs/legal/privacy-policy.txt",
    content:
      "ACME PRIVACY POLICY\nAll data is encrypted in transit and at rest.",
    type: "text/plain",
  },
  {
    relativePath: "acme-saas-platform/docs/legal/terms.txt",
    content:
      "ACME TERMS OF SERVICE\nBy using this software you agree to our terms.",
    type: "text/plain",
  },
  {
    relativePath: "acme-saas-platform/docs/notes.txt",
    content: "Q4 Documentation roadmap and release checklist.",
    type: "text/plain",
  },
  {
    relativePath: "acme-saas-platform/src/notes.txt",
    content: "Developer scratchpad: fix memory leak in worker pool.",
    type: "text/plain",
  },
  {
    relativePath: "acme-saas-platform/src/index.ts",
    content:
      'import express from "express";\nconst app = express();\napp.listen(3000, () => console.log("Ready"));',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/config/database.ts",
    content: 'export const dbConfig = { host: "localhost", port: 5432 };',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/config/auth.ts",
    content: 'export const jwtOptions = { expiresIn: "24h" };',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/Header.tsx",
    content:
      'export function Header() { return <header className="navbar">Acme SaaS</header>; }',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/Sidebar.tsx",
    content: "export function Sidebar() { return <aside>Navigation</aside>; }",
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/Dashboard.tsx",
    content:
      "export function Dashboard() { return <main>Metrics & KPIs</main>; }",
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/ui/Button.tsx",
    content:
      "export function Button({ children }: { children: React.ReactNode }) { return <button>{children}</button>; }",
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/ui/Modal.tsx",
    content:
      'export function Modal({ isOpen }: { isOpen: boolean }) { return isOpen ? <div className="modal" /> : null; }',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/assets/styles/global.css",
    content:
      ":root { --primary: #3b82f6; }\nbody { margin: 0; font-family: sans-serif; }",
    type: "text/css",
  },
  {
    relativePath: "acme-saas-platform/src/assets/icons/logo.svg",
    content:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg>',
    type: "image/svg+xml",
  },
  {
    relativePath: "acme-saas-platform/src/assets/icons/avatar.svg",
    content:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="#64748b"/></svg>',
    type: "image/svg+xml",
  },
  {
    relativePath: "acme-saas-platform/tests/unit/auth.test.ts",
    content:
      'describe("Auth", () => { it("validates tokens", () => expect(true).toBe(true)); });',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/tests/e2e/login.spec.ts",
    content:
      'test("login flow", async ({ page }) => { await page.goto("/login"); });',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/scripts/deploy.sh",
    content:
      '#!/usr/bin/env bash\necho "Deploying to production..."\ndocker build -t acme-saas .',
    type: "application/x-sh",
  },
  {
    relativePath: "acme-saas-platform/data/seeds/users.csv",
    content:
      "id,name,role,email\n1,Alice,Admin,alice@acme.com\n2,Bob,Developer,bob@acme.com\n3,Charlie,Designer,charlie@acme.com",
    type: "text/csv",
  },
];

const heavyFilesData: SampleTemplateFile[] = [
  {
    relativePath: "acme-saas-platform/node_modules/react/index.js",
    content: 'module.exports = require("./cjs/react.production.min.js");',
    type: "application/javascript",
  },
  {
    relativePath: "acme-saas-platform/node_modules/react/package.json",
    content: '{\n  "name": "react",\n  "version": "19.0.0"\n}',
    type: "application/json",
  },
  {
    relativePath: "acme-saas-platform/node_modules/react-dom/index.js",
    content: 'module.exports = require("./cjs/react-dom.production.min.js");',
    type: "application/javascript",
  },
  {
    relativePath: "acme-saas-platform/node_modules/lodash/lodash.js",
    content: "var lodash = function() {}; module.exports = lodash;",
    type: "application/javascript",
  },
  {
    relativePath: "acme-saas-platform/node_modules/express/index.js",
    content: 'module.exports = require("./lib/express");',
    type: "application/javascript",
  },
  {
    relativePath: "acme-saas-platform/.git/config",
    content:
      "[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n",
    type: "",
  },
  {
    relativePath: "acme-saas-platform/.git/HEAD",
    content: "ref: refs/heads/main\n",
    type: "",
  },
  {
    relativePath: "acme-saas-platform/dist/bundle.js",
    content: '!function(){console.log("built bundle")}()',
    type: "application/javascript",
  },
];

/* ------------------------------------------------------------------ */
/* Test scenario data                                                   */
/* ------------------------------------------------------------------ */

/** Minimal PNG header bytes so the blob is a plausible binary payload. */
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
]);

// NOTE: every file in this scenario uses type: "" — exactly what browsers
// report for .env.example, .go, .rs, dotfiles and friends. With "text/plain"
// the pre-fix reader (which read any text/* file) would pass too, and the
// scenario would prove nothing.
const FORMAT_FILES: SampleTemplateFile[] = [
  {
    relativePath: "format-coverage/.env.example",
    content:
      "PORT=3000\nDATABASE_URL=postgres://localhost:5432/app\nAPI_KEY=replace_me",
    type: "",
  },
  {
    relativePath: "format-coverage/.gitignore",
    content: "node_modules/\ndist/\n*.log\n",
    type: "",
  },
  {
    relativePath: "format-coverage/.editorconfig",
    content: "root = true\n\n[*]\nindent_style = space\nindent_size = 2\n",
    type: "",
  },
  {
    relativePath: "format-coverage/.nvmrc",
    content: "20.11.0\n",
    type: "",
  },
  {
    relativePath: "format-coverage/Dockerfile",
    content:
      'FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["node", "server.js"]\n',
    type: "",
  },
  {
    relativePath: "format-coverage/Makefile",
    content:
      "build:\n\tgo build -o bin/app ./cmd/app\n\nclean:\n\trm -rf bin\n",
    type: "",
  },
  {
    relativePath: "format-coverage/LICENSE",
    content: "MIT License\n\nCopyright (c) 2026 Test Corp\n",
    type: "",
  },
  {
    relativePath: "format-coverage/src/App.jsx",
    content:
      'export function App() {\n  return <div className="app">Hello JSX</div>;\n}\n',
    type: "",
  },
  {
    relativePath: "format-coverage/src/Widget.vue",
    content:
      '<template>\n  <button @click="count++">{{ count }}</button>\n</template>\n\n<script setup>\nconst count = ref(0);\n</script>\n',
    type: "",
  },
  {
    relativePath: "format-coverage/src/main.go",
    content:
      'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hello go")\n}\n',
    type: "",
  },
  {
    relativePath: "format-coverage/src/lib.rs",
    content:
      'pub fn greet(name: &str) -> String {\n    format!("Hello, {}!", name)\n}\n',
    type: "",
  },
  {
    relativePath: "format-coverage/src/Main.java",
    content:
      'public class Main {\n    public static void main(String[] args) {\n        System.out.println("hello");\n    }\n}\n',
    type: "",
  },
  {
    relativePath: "format-coverage/config/app.yml",
    content:
      "server:\n  port: 8080\n  host: 0.0.0.0\ndatabase:\n  url: postgres://localhost/app\n",
    type: "",
  },
  {
    relativePath: "format-coverage/config/pyproject.toml",
    content:
      '[project]\nname = "app"\nversion = "0.1.0"\ndependencies = ["flask"]\n',
    type: "",
  },
  {
    relativePath: "format-coverage/db/schema.sql",
    content:
      "CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE\n);\n",
    type: "",
  },
  {
    relativePath: "format-coverage/api/schema.graphql",
    content: "type Query {\n  user(id: ID!): User\n}\n",
    type: "",
  },
];

const GITIGNORE_FILES: SampleTemplateFile[] = [
  // Custom rules deliberately NOT in the hardcoded exclusion list,
  // so their exclusion can only come from .gitignore parsing.
  //
  // GIT-ACCURATE NEGATION: we use `temp/*` (excludes the directory's
  // CONTENTS) rather than `temp/` (excludes the directory itself).
  // Real git cannot re-include a file whose parent directory is excluded,
  // so `temp/` + `!important.dat` would keep important.dat ignored.
  // With `temp/*`, git still descends into temp/ and !important.dat
  // legitimately re-includes the file.
  {
    relativePath: "gitignore-rules/.gitignore",
    content: [
      "# custom ignore rules",
      "logs/",
      "temp/*",
      "*.dat",
      "!important.dat",
      "/build-output/",
      "secret-*",
      "",
    ].join("\n"),
    type: "",
  },
  // Should be EXCLUDED by gitignore:
  {
    relativePath: "gitignore-rules/logs/debug.log",
    content: "2026-11-09 ERROR something broke",
    type: "text/plain",
  },
  {
    relativePath: "gitignore-rules/logs/app.log",
    content: "2026-11-09 INFO started",
    type: "text/plain",
  },
  {
    relativePath: "gitignore-rules/temp/cache.dat",
    content: "BINARYCACHE",
    type: "text/plain",
  },
  {
    relativePath: "gitignore-rules/build-output/bundle.js",
    content: "!function(){}()",
    type: "application/javascript",
  },
  {
    relativePath: "gitignore-rules/secret-token.txt",
    content: "sk-live-abc123",
    type: "text/plain",
  },
  // Should SURVIVE (negation !important.dat against temp/*):
  {
    relativePath: "gitignore-rules/temp/important.dat",
    content: "KEEP ME — negated by !important.dat",
    type: "text/plain",
  },
  // Should SURVIVE (no rule matches):
  {
    relativePath: "gitignore-rules/src/App.tsx",
    content: "export function App() { return <main />; }",
    type: "text/typescript",
  },
  {
    relativePath: "gitignore-rules/README.md",
    content: "# Gitignore Rules Test\nVerify custom rules are applied.",
    type: "text/markdown",
  },
];

const SECRETS_FILES: SampleTemplateFile[] = [
  // Should be FLAGGED as secrets:
  {
    relativePath: "secrets-warning/.env",
    content:
      "DATABASE_URL=postgres://prod:5432/live\nSTRIPE_KEY=sk_live_51RealKey\n",
    type: "",
  },
  {
    relativePath: "secrets-warning/.env.local",
    content: "VITE_API_KEY=local-dev-key-123\n",
    type: "",
  },
  {
    relativePath: "secrets-warning/.env.production",
    content: "SENTRY_DSN=https://abc@sentry.io/123\n",
    type: "",
  },
  {
    relativePath: "secrets-warning/config/credentials.json",
    content:
      '{\n  "client_email": "svc@project.iam.gserviceaccount.com",\n  "private_key": "-----BEGIN PRIVATE KEY-----"\n}',
    type: "application/json",
  },
  // Should NOT be flagged (safe template):
  {
    relativePath: "secrets-warning/.env.example",
    content:
      "DATABASE_URL=postgres://localhost:5432/app\nSTRIPE_KEY=sk_test_replace_me\n",
    type: "",
  },
  // Normal files:
  {
    relativePath: "secrets-warning/src/App.tsx",
    content: "export function App() { return <main>Safe</main>; }",
    type: "text/typescript",
  },
  {
    relativePath: "secrets-warning/README.md",
    content: "# Secrets Warning Test",
    type: "text/markdown",
  },
];

// Built lazily: allocating a 600KB string at module load would tax every
// visitor, even those who never open the dev scenarios.
const buildLimitsFiles = (): SampleTemplateFile[] => [
  // Over the 512KB text-read cap → the real reader skips it → honest message
  {
    relativePath: "size-limits/huge-dump.txt",
    content: "x".repeat(600 * 1024),
    type: "text/plain",
  },
  // Zero bytes → reader returns "" → "(File is empty)"
  { relativePath: "size-limits/empty.txt", content: "", type: "text/plain" },
  // Binary → content sniffer finds NUL bytes → "(Binary content...)"
  {
    relativePath: "size-limits/assets/logo.png",
    content: "",
    type: "image/png",
    binary: PNG_BYTES,
  },
  // Readable contrast file
  {
    relativePath: "size-limits/src/index.ts",
    content: 'export const ok = "fully readable";\n',
    type: "text/typescript",
  },
];

const COLLISION_FILES: SampleTemplateFile[] = [
  {
    relativePath: "collision-stress/docs/notes.txt",
    content: "Documentation notes",
    type: "text/plain",
  },
  {
    relativePath: "collision-stress/src/notes.txt",
    content: "Source notes",
    type: "text/plain",
  },
  {
    relativePath: "collision-stress/tests/notes.txt",
    content: "Test notes",
    type: "text/plain",
  },
  {
    relativePath: "collision-stress/personal/notes.txt",
    content: "Personal notes",
    type: "text/plain",
  },
  {
    relativePath: "collision-stress/web/App.tsx",
    content: "export function App() { return <div>web</div>; }",
    type: "text/typescript",
  },
  {
    relativePath: "collision-stress/mobile/App.tsx",
    content: "export function App() { return <div>mobile</div>; }",
    type: "text/typescript",
  },
  {
    relativePath: "collision-stress/unique.md",
    content: "# No collision here",
    type: "text/markdown",
  },
];

/* ------------------------------------------------------------------ */
/* Scenario assembly                                                    */
/* ------------------------------------------------------------------ */

export interface SampleScenario {
  id: SampleScenarioId;
  rootName: string;
  /** Real File objects — feed these to processFileList(), NOT to the app directly. */
  files: File[];
}

/**
 * Builds a complete scenario as REAL File objects. Callers must load them
 * through processFileList() so the production reader, gitignore parser,
 * exclusion logic, and secrets detector all genuinely run.
 * Expected-results checklists live in SAMPLE_SCENARIOS (static data) so
 * rendering the scenario buttons never builds File objects.
 */
export function getScenarioProject(id: SampleScenarioId): SampleScenario {
  switch (id) {
    case "clean":
      return {
        id,
        rootName: "acme-saas-platform",
        files: sampleFilesData.map(toFile),
      };
    case "heavy":
      return {
        id,
        rootName: "acme-saas-platform",
        files: [...sampleFilesData, ...heavyFilesData].map(toFile),
      };
    case "formats":
      return {
        id,
        rootName: "format-coverage",
        files: FORMAT_FILES.map(toFile),
      };
    case "gitignore":
      return {
        id,
        rootName: "gitignore-rules",
        files: GITIGNORE_FILES.map(toFile),
      };
    case "secrets":
      return {
        id,
        rootName: "secrets-warning",
        files: SECRETS_FILES.map(toFile),
      };
    case "limits":
      return {
        id,
        rootName: "size-limits",
        files: buildLimitsFiles().map(toFile),
      };
    case "collisions":
      return {
        id,
        rootName: "collision-stress",
        files: COLLISION_FILES.map(toFile),
      };
  }
}
