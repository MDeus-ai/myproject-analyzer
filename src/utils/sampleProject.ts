import { ProcessedFile } from '../types';
import { getFileCategory, getFileExtension } from './fileHelpers';

interface SampleTemplateFile {
  relativePath: string;
  content: string;
  type: string;
  size?: number;
}

const sampleFilesData: SampleTemplateFile[] = [
  {
    relativePath: 'acme-saas-platform/README.md',
    content: '# Acme SaaS Platform\n\nA full-stack cloud enterprise platform.\n\n## Quickstart\nRun `npm install` and `npm start`.',
    type: 'text/markdown',
  },
  {
    relativePath: 'acme-saas-platform/package.json',
    content: '{\n  "name": "acme-saas",\n  "version": "2.4.0",\n  "dependencies": {\n    "react": "^19.0.0"\n  }\n}',
    type: 'application/json',
  },
  {
    relativePath: 'acme-saas-platform/.env.example',
    content: 'PORT=3000\nDATABASE_URL=postgres://localhost:5432/acmedb\nAPI_SECRET=change_me',
    type: 'text/plain',
  },
  {
    relativePath: 'acme-saas-platform/docs/architecture.md',
    content: '# Architecture Overview\nMicroservices with event-driven message bus and Postgres storage.',
    type: 'text/markdown',
  },
  {
    relativePath: 'acme-saas-platform/docs/api/endpoints.json',
    content: '[\n  { "path": "/api/users", "method": "GET" },\n  { "path": "/api/auth/login", "method": "POST" }\n]',
    type: 'application/json',
  },
  {
    relativePath: 'acme-saas-platform/docs/legal/privacy-policy.txt',
    content: 'ACME PRIVACY POLICY\nAll data is encrypted in transit and at rest.',
    type: 'text/plain',
  },
  {
    relativePath: 'acme-saas-platform/docs/legal/terms.txt',
    content: 'ACME TERMS OF SERVICE\nBy using this software you agree to our terms.',
    type: 'text/plain',
  },
  {
    relativePath: 'acme-saas-platform/docs/notes.txt',
    content: 'Q4 Documentation roadmap and release checklist.',
    type: 'text/plain',
  },
  // Intentional collision: notes.txt in personal vs docs vs src
  {
    relativePath: 'acme-saas-platform/src/notes.txt',
    content: 'Developer scratchpad: fix memory leak in worker pool.',
    type: 'text/plain',
  },
  {
    relativePath: 'acme-saas-platform/src/index.ts',
    content: 'import express from "express";\nconst app = express();\napp.listen(3000, () => console.log("Ready"));',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/config/database.ts',
    content: 'export const dbConfig = { host: "localhost", port: 5432 };',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/config/auth.ts',
    content: 'export const jwtOptions = { expiresIn: "24h" };',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/components/Header.tsx',
    content: 'export function Header() { return <header className="navbar">Acme SaaS</header>; }',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/components/Sidebar.tsx',
    content: 'export function Sidebar() { return <aside>Navigation</aside>; }',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/components/Dashboard.tsx',
    content: 'export function Dashboard() { return <main>Metrics & KPIs</main>; }',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/components/ui/Button.tsx',
    content: 'export function Button({ children }: { children: React.ReactNode }) { return <button>{children}</button>; }',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/components/ui/Modal.tsx',
    content: 'export function Modal({ isOpen }: { isOpen: boolean }) { return isOpen ? <div className="modal" /> : null; }',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/src/assets/styles/global.css',
    content: ':root { --primary: #3b82f6; }\nbody { margin: 0; font-family: sans-serif; }',
    type: 'text/css',
  },
  {
    relativePath: 'acme-saas-platform/src/assets/icons/logo.svg',
    content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg>',
    type: 'image/svg+xml',
  },
  {
    relativePath: 'acme-saas-platform/src/assets/icons/avatar.svg',
    content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="#64748b"/></svg>',
    type: 'image/svg+xml',
  },
  {
    relativePath: 'acme-saas-platform/tests/unit/auth.test.ts',
    content: 'describe("Auth", () => { it("validates tokens", () => expect(true).toBe(true)); });',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/tests/e2e/login.spec.ts',
    content: 'test("login flow", async ({ page }) => { await page.goto("/login"); });',
    type: 'text/typescript',
  },
  {
    relativePath: 'acme-saas-platform/scripts/deploy.sh',
    content: '#!/usr/bin/env bash\necho "Deploying to production..."\ndocker build -t acme-saas .',
    type: 'application/x-sh',
  },
  {
    relativePath: 'acme-saas-platform/data/seeds/users.csv',
    content: 'id,name,role,email\n1,Alice,Admin,alice@acme.com\n2,Bob,Developer,bob@acme.com\n3,Charlie,Designer,charlie@acme.com',
    type: 'text/csv',
  },
];

/**
 * Loads a realistic rich sample directory project with 24 files across 8 subdirectories.
 */
export function getSampleProjectFiles(): ProcessedFile[] {
  return sampleFilesData.map((item, index) => {
    const segments = item.relativePath.split('/');
    const name = segments[segments.length - 1];
    const dirSegments = segments.slice(1, -1);
    const directoryPath = dirSegments.join('/');

    const blob = new Blob([item.content], { type: item.type });
    const size = blob.size || item.content.length;
    const extension = getFileExtension(name);

    return {
      id: `sample-${index + 1}`,
      name,
      originalName: name,
      flattenedName: name,
      relativePath: item.relativePath,
      pathSegments: segments,
      directoryPath,
      size,
      type: item.type,
      extension,
      lastModified: Date.now() - (index * 3600000 * 4),
      blob,
      textContent: item.content,
    };
  });
}

/**
 * Loads a project containing heavy folders (node_modules, .git, dist)
 * to demonstrate the automatic exclusion detection and warning modal.
 */
export function getSampleProjectWithHeavyFolders(): ProcessedFile[] {
  const clean = getSampleProjectFiles();
  const heavyFiles: SampleTemplateFile[] = [
    {
      relativePath: 'acme-saas-platform/node_modules/react/index.js',
      content: 'module.exports = require("./cjs/react.production.min.js");',
      type: 'application/javascript',
    },
    {
      relativePath: 'acme-saas-platform/node_modules/react/package.json',
      content: '{\n  "name": "react",\n  "version": "19.0.0"\n}',
      type: 'application/json',
    },
    {
      relativePath: 'acme-saas-platform/node_modules/react-dom/index.js',
      content: 'module.exports = require("./cjs/react-dom.production.min.js");',
      type: 'application/javascript',
    },
    {
      relativePath: 'acme-saas-platform/node_modules/lodash/lodash.js',
      content: 'var lodash = function() {}; module.exports = lodash;',
      type: 'application/javascript',
    },
    {
      relativePath: 'acme-saas-platform/node_modules/express/index.js',
      content: 'module.exports = require("./lib/express");',
      type: 'application/javascript',
    },
    {
      relativePath: 'acme-saas-platform/.git/config',
      content: '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n',
      type: 'text/plain',
    },
    {
      relativePath: 'acme-saas-platform/.git/HEAD',
      content: 'ref: refs/heads/main\n',
      type: 'text/plain',
    },
    {
      relativePath: 'acme-saas-platform/dist/bundle.js',
      content: '!function(){console.log("built bundle")}()',
      type: 'application/javascript',
    },
  ];

  const heavyProcessed: ProcessedFile[] = heavyFiles.map((item, index) => {
    const segments = item.relativePath.split('/');
    const name = segments[segments.length - 1];
    const dirSegments = segments.slice(1, -1);
    const directoryPath = dirSegments.join('/');

    const blob = new Blob([item.content], { type: item.type });
    const size = blob.size || item.content.length;
    const extension = getFileExtension(name);

    return {
      id: `heavy-${index + 1}`,
      name,
      originalName: name,
      flattenedName: name,
      relativePath: item.relativePath,
      pathSegments: segments,
      directoryPath,
      size,
      type: item.type,
      extension,
      lastModified: Date.now() - (index * 3600000 * 2),
      blob,
      textContent: item.content,
    };
  });

  return [...clean, ...heavyProcessed];
}
