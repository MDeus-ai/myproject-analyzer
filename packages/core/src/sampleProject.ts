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
  | "web"
  | "rust"
  | "cpp"
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
    label: "Clean Demo (Web SaaS)",
    verifies: "Baseline: TypeScript/React SaaS project, all views work",
    expected: [
      "24 files imported",
      "No exclusion modal",
      "No secrets banner",
      "All views (Files/Tree/PDF/Stats/Analyzer/DepLenz) render",
    ],
  },
  {
    id: "rust",
    label: "Rust KV Engine",
    verifies: "Rust codebase analysis: fn, struct, trait, impl methods, crate:: imports",
    expected: [
      "Rust Systems Lens detected in DepLenz",
      "Extracts structs (WalWriter, MemTable, KvServer), traits (StorageEngine), and impl methods",
      "Resolves use crate::storage::wal and use crate::net::server call edges",
    ],
  },
  {
    id: "cpp",
    label: "C++20 Physics Engine",
    verifies: "C/C++ codebase analysis: #include header-to-source linking, classes, structs, methods",
    expected: [
      "C/C++ Native Lens detected in DepLenz",
      "Links #include \"engine/world.hpp\" in main.cpp toPhysicsWorld::stepSimulation in world.cpp",
      "Extracts Vec3 struct, PhysicsWorld class, RenderPipeline class, and out-of-line methods",
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
      'import express from "express";\nimport { connectDatabase } from "./config/database";\nimport { startServer } from "./server";\n\nexport function main() {\n  connectDatabase();\n  startServer();\n}\n\nmain();',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/server.ts",
    content:
      'import { validateToken } from "./config/auth";\n\nexport function startServer() {\n  console.log("Server listening on port 3000");\n}\n\nexport function handleRequest(token: string) {\n  return validateToken(token);\n}',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/config/database.ts",
    content:
      'export const dbConfig = { host: "localhost", port: 5432 };\n\nexport function connectDatabase() {\n  console.log("Connected to PostgreSQL at", dbConfig.host);\n  return true;\n}\n\nexport function queryUser(userId: string) {\n  return { id: userId, role: "admin", name: "Alex" };\n}',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/config/auth.ts",
    content:
      'import { queryUser } from "./database";\n\nexport function validateToken(token: string): boolean {\n  return token.length > 10;\n}\n\nexport function createSession(userId: string) {\n  const user = queryUser(userId);\n  return { token: "tok_" + userId, user };\n}\n\nexport function useAuth() {\n  return { isAuthenticated: true, user: "Alex" };\n}',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/Header.tsx",
    content:
      'import React from "react";\nimport { Button } from "./ui/Button";\nimport { useAuth } from "../config/auth";\n\nexport function Header() {\n  const auth = useAuth();\n  return (\n    <header className="navbar">\n      <h1>Acme SaaS</h1>\n      <Button onClick={() => console.log("Logout")}>Logout {auth.user}</Button>\n    </header>\n  );\n}',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/Sidebar.tsx",
    content:
      'import React from "react";\nimport { Button } from "./ui/Button";\n\nexport function Sidebar() {\n  return (\n    <aside className="sidebar">\n      <nav>\n        <Button>Overview</Button>\n        <Button>Settings</Button>\n      </nav>\n    </aside>\n  );\n}',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/Dashboard.tsx",
    content:
      'import React, { useState } from "react";\nimport { Header } from "./Header";\nimport { Sidebar } from "./Sidebar";\nimport { Modal } from "./ui/Modal";\nimport { Button } from "./ui/Button";\nimport { queryUser } from "../config/database";\n\nexport function Dashboard() {\n  const [isModalOpen, setIsModalOpen] = useState(false);\n  const user = queryUser("usr_42");\n  return (\n    <main className="dashboard">\n      <Header />\n      <div className="layout">\n        <Sidebar />\n        <section>\n          <h2>Welcome {user.name}</h2>\n          <Button onClick={() => setIsModalOpen(true)}>Open Details</Button>\n          <Modal isOpen={isModalOpen} />\n        </section>\n      </div>\n    </main>\n  );\n}',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/ui/Button.tsx",
    content:
      'import React from "react";\n\nexport function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {\n  return <button className="btn" onClick={onClick}>{children}</button>;\n}',
    type: "text/typescript",
  },
  {
    relativePath: "acme-saas-platform/src/components/ui/Modal.tsx",
    content:
      'import React from "react";\nimport { Button } from "./Button";\n\nexport function Modal({ isOpen }: { isOpen: boolean }) {\n  if (!isOpen) return null;\n  return (\n    <div className="modal-backdrop">\n      <div className="modal-content">\n        <h3>Dialog</h3>\n        <Button>Close</Button>\n      </div>\n    </div>\n  );\n}',
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

const RUST_ENGINE_FILES: SampleTemplateFile[] = [
  {
    relativePath: "orbit-kv-engine/Cargo.toml",
    content: [
      '[package]',
      'name = "orbit-kv-engine"',
      'version = "0.4.2"',
      'edition = "2021"',
      '',
      '[dependencies]',
      'tokio = { version = "1.38", features = ["full"] }',
      'serde = { version = "1.0", features = ["derive"] }',
      'bytes = "1.6"',
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "orbit-kv-engine/README.md",
    content:
      "# Orbit KV Engine\n\nHigh-throughput log-structured merge-tree (LSM) key-value store written in Rust.\n\n## Architecture\n- `src/storage/wal.rs` — Write-Ahead Log with CRC32 frame integrity\n- `src/storage/memtable.rs` — Concurrent skip-list MemTable & StorageEngine trait\n- `src/net/server.rs` — Async TCP protocol server",
    type: "text/markdown",
  },
  {
    relativePath: "orbit-kv-engine/src/lib.rs",
    content: [
      "pub mod storage;",
      "pub mod net;",
      "",
      "use crate::storage::memtable::{MemTable, open_memtable};",
      "use crate::storage::wal::append_wal_record;",
      "",
      "pub struct EngineConfig {",
      "    pub data_dir: String,",
      "    pub max_memtable_bytes: usize,",
      "    pub sync_on_write: bool,",
      "}",
      "",
      "pub fn bootstrap_engine(config: EngineConfig) -> MemTable {",
      "    append_wal_record(&config.data_dir, b\"BOOTSTRAP\");",
      "    open_memtable(config.max_memtable_bytes)",
      "}",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "orbit-kv-engine/src/main.rs",
    content: [
      "use crate::lib::{EngineConfig, bootstrap_engine};",
      "use crate::net::server::{KvServer, start_rpc_listener};",
      "",
      "pub fn main() {",
      "    let cfg = EngineConfig {",
      '        data_dir: String::from("/var/lib/orbit"),',
      "        max_memtable_bytes: 64 * 1024 * 1024,",
      "        sync_on_write: true,",
      "    };",
      "    let table = bootstrap_engine(cfg);",
      "    start_rpc_listener(table, 7480);",
      "}",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "orbit-kv-engine/src/storage/wal.rs",
    content: [
      "use std::fs::OpenOptions;",
      "use std::io::Write;",
      "",
      "#[derive(Debug, Clone)]",
      "pub struct WalRecord {",
      "    pub sequence: u64,",
      "    pub checksum: u32,",
      "    pub payload: Vec<u8>,",
      "}",
      "",
      "pub fn compute_crc32(payload: &[u8]) -> u32 {",
      "    let mut hash: u32 = 0x811c9dc5;",
      "    for byte in payload {",
      "        hash ^= *byte as u32;",
      "        hash = hash.wrapping_mul(0x01000193);",
      "    }",
      "    hash",
      "}",
      "",
      "pub fn append_wal_record(dir: &str, payload: &[u8]) -> WalRecord {",
      "    let crc = compute_crc32(payload);",
      "    WalRecord {",
      "        sequence: 1,",
      "        checksum: crc,",
      "        payload: payload.to_vec(),",
      "    }",
      "}",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "orbit-kv-engine/src/storage/memtable.rs",
    content: [
      "use std::collections::BTreeMap;",
      "use crate::storage::wal::{WalRecord, append_wal_record, compute_crc32};",
      "",
      "pub trait StorageEngine {",
      "    fn put_key(&mut self, key: String, value: Vec<u8>) -> bool;",
      "    fn get_key(&self, key: &str) -> Option<Vec<u8>>;",
      "}",
      "",
      "pub struct MemTable {",
      "    pub entries: BTreeMap<String, Vec<u8>>,",
      "    pub capacity_bytes: usize,",
      "}",
      "",
      "impl MemTable {",
      "    pub fn insert_entry(&mut self, key: String, value: Vec<u8>) -> WalRecord {",
      '        let rec = append_wal_record("/var/lib/orbit", &value);',
      "        self.entries.insert(key, value);",
      "        rec",
      "    }",
      "",
      "    pub fn verify_snapshot(&self, buf: &[u8]) -> u32 {",
      "        compute_crc32(buf)",
      "    }",
      "}",
      "",
      "pub fn open_memtable(capacity_bytes: usize) -> MemTable {",
      "    MemTable {",
      "        entries: BTreeMap::new(),",
      "        capacity_bytes,",
      "    }",
      "}",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "orbit-kv-engine/src/net/server.rs",
    content: [
      "use tokio::net::TcpListener;",
      "use crate::storage::memtable::MemTable;",
      "use crate::storage::wal::compute_crc32;",
      "",
      "pub struct KvServer {",
      "    pub port: u16,",
      "    pub active_connections: usize,",
      "}",
      "",
      "pub fn dispatch_frame(table: &mut MemTable, key: String, payload: Vec<u8>) -> u32 {",
      "    let rec = table.insert_entry(key, payload.clone());",
      "    compute_crc32(&rec.payload)",
      "}",
      "",
      "pub fn start_rpc_listener(mut table: MemTable, port: u16) -> KvServer {",
      '    let _checksum = dispatch_frame(&mut table, String::from("health"), vec![1, 2, 3]);',
      "    KvServer {",
      "        port,",
      "        active_connections: 1,",
      "    }",
      "}",
    ].join("\n"),
    type: "",
  },
];

const CPP_ENGINE_FILES: SampleTemplateFile[] = [
  {
    relativePath: "chrono-physics-engine/CMakeLists.txt",
    content: [
      "cmake_minimum_required(VERSION 3.24)",
      "project(ChronoPhysicsEngine LANGUAGES CXX)",
      "set(CMAKE_CXX_STANDARD 20)",
      "include_directories(include)",
      "add_executable(chrono_sim src/main.cpp src/engine/world.cpp src/renderer/pipeline.cpp)",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "chrono-physics-engine/README.md",
    content:
      "# Chrono C++20 Rigid-Body Physics & Vulkan Renderer\n\nDeterministic rigid-body simulation engine with SIMD vector math and frame-graph rendering.",
    type: "text/markdown",
  },
  {
    relativePath: "chrono-physics-engine/include/math/vec3.hpp",
    content: [
      "#pragma once",
      "#include <cmath>",
      "",
      "struct Vec3 {",
      "    float x;",
      "    float y;",
      "    float z;",
      "};",
      "",
      "inline Vec3 addVec3(const Vec3& a, const Vec3& b) {",
      "    return Vec3{a.x + b.x, a.y + b.y, a.z + b.z};",
      "}",
      "",
      "inline Vec3 scaleVec3(const Vec3& v, float s) {",
      "    return Vec3{v.x * s, v.y * s, v.z * s};",
      "}",
      "",
      "inline float dotVec3(const Vec3& a, const Vec3& b) {",
      "    return a.x * b.x + a.y * b.y + a.z * b.z;",
      "}",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "chrono-physics-engine/include/engine/world.hpp",
    content: [
      "#pragma once",
      "#include <vector>",
      '#include "math/vec3.hpp"',
      "",
      "struct RigidBody {",
      "    int id;",
      "    Vec3 position;",
      "    Vec3 velocity;",
      "    float mass;",
      "};",
      "",
      "class PhysicsWorld {",
      "public:",
      "    void stepSimulation(float dt);",
      "    RigidBody integrateBody(const RigidBody& body, float dt);",
      "};",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "chrono-physics-engine/src/engine/world.cpp",
    content: [
      '#include "engine/world.hpp"',
      '#include "math/vec3.hpp"',
      "",
      "RigidBody integrateBody(const RigidBody& body, float dt) {",
      "    Vec3 delta = scaleVec3(body.velocity, dt);",
      "    Vec3 nextPos = addVec3(body.position, delta);",
      "    return RigidBody{body.id, nextPos, body.velocity, body.mass};",
      "}",
      "",
      "void stepSimulation(float dt) {",
      "    RigidBody probe{1, Vec3{0.0f, 10.0f, 0.0f}, Vec3{1.5f, -9.8f, 0.0f}, 2.0f};",
      "    RigidBody updated = integrateBody(probe, dt);",
      "    float energy = dotVec3(updated.velocity, updated.velocity);",
      "    (void)energy;",
      "}",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "chrono-physics-engine/include/renderer/pipeline.hpp",
    content: [
      "#pragma once",
      '#include "math/vec3.hpp"',
      '#include "engine/world.hpp"',
      "",
      "class RenderPipeline {",
      "public:",
      "    void renderFrame(float dt);",
      "};",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "chrono-physics-engine/src/renderer/pipeline.cpp",
    content: [
      "#include <iostream>",
      '#include "renderer/pipeline.hpp"',
      '#include "engine/world.hpp"',
      '#include "math/vec3.hpp"',
      "",
      "void submitDrawCall(const Vec3& cameraPos) {",
      "    float distSq = dotVec3(cameraPos, cameraPos);",
      "    (void)distSq;",
      "}",
      "",
      "void renderFrame(float dt) {",
      "    stepSimulation(dt);",
      "    Vec3 cam = addVec3(Vec3{0.0f, 5.0f, -12.0f}, Vec3{0.0f, 0.0f, 1.0f});",
      "    submitDrawCall(cam);",
      "}",
    ].join("\n"),
    type: "",
  },
  {
    relativePath: "chrono-physics-engine/src/main.cpp",
    content: [
      "#include <iostream>",
      '#include "engine/world.hpp"',
      '#include "renderer/pipeline.hpp"',
      "",
      "int main() {",
      "    const float timeStep = 0.0166f;",
      "    stepSimulation(timeStep);",
      "    renderFrame(timeStep);",
      "    return 0;",
      "}",
    ].join("\n"),
    type: "",
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
    case "web":
      return {
        id,
        rootName: "acme-saas-platform",
        files: sampleFilesData.map(toFile),
      };
    case "rust":
      return {
        id,
        rootName: "orbit-kv-engine",
        files: RUST_ENGINE_FILES.map(toFile),
      };
    case "cpp":
      return {
        id,
        rootName: "chrono-physics-engine",
        files: CPP_ENGINE_FILES.map(toFile),
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
