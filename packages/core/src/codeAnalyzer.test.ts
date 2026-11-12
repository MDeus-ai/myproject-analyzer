import test from "node:test";
import assert from "node:assert/strict";
import {
  identifyCodeFileType,
  formatSingleCodeFile,
  combineMultipleCodeFiles,
  countLines,
  estimateTokens,
  getRelativePathFromRoot,
} from "@myproject/core/codeAnalyzer";
import { ProcessedFile } from "@myproject/core/types";

const sampleBundle: ProcessedFile[] = [
  {
    id: "f1",
    name: "index.html",
    originalName: "index.html",
    flattenedName: "index.html",
    relativePath: "app/public/index.html",
    pathSegments: ["app", "public", "index.html"],
    directoryPath: "public",
    size: 40,
    type: "text/html",
    extension: "html",
    lastModified: 1700000000000,
    textContent: "<!DOCTYPE html><html><body>App</body></html>",
  },
  {
    id: "f2",
    name: "app.js",
    originalName: "app.js",
    flattenedName: "app.js",
    relativePath: "app/src/app.js",
    pathSegments: ["app", "src", "app.js"],
    directoryPath: "src",
    size: 30,
    type: "application/javascript",
    extension: "js",
    lastModified: 1700000001000,
    textContent: 'console.log("running");',
  },
];

test("identifyCodeFileType correctly identifies various code formats", () => {
  const tsx = identifyCodeFileType("Button.tsx");
  assert.equal(tsx.isCode, true);
  assert.equal(tsx.fileType, "tsx");
  assert.equal(tsx.language, "TypeScript React");

  const html = identifyCodeFileType("index.html");
  assert.equal(html.isCode, true);
  assert.equal(html.fileType, "html");

  const ts = identifyCodeFileType("server.ts");
  assert.equal(ts.isCode, true);
  assert.equal(ts.fileType, "ts");

  const jsx = identifyCodeFileType("App.jsx");
  assert.equal(jsx.isCode, true);
  assert.equal(jsx.fileType, "jsx");

  const js = identifyCodeFileType("script.js");
  assert.equal(js.isCode, true);
  assert.equal(js.fileType, "js");

  const env = identifyCodeFileType(".env.example");
  assert.equal(env.isCode, true);

  const docker = identifyCodeFileType("Dockerfile");
  assert.equal(docker.isCode, true);
  assert.equal(docker.fileType, "dockerfile");

  const binary = identifyCodeFileType("image.png");
  assert.equal(binary.isCode, false);
});

test("formatSingleCodeFile formats with 1) metadata on top, 2) actual content, 3) end indicator", () => {
  const sampleFile: ProcessedFile = {
    id: "f1",
    name: "Header.tsx",
    originalName: "Header.tsx",
    flattenedName: "Header.tsx",
    relativePath: "my-project/src/components/Header.tsx",
    pathSegments: ["my-project", "src", "components", "Header.tsx"],
    directoryPath: "src/components",
    size: 50,
    type: "text/typescript",
    extension: "tsx",
    lastModified: 1700000000000,
    textContent: "export function Header() { return <header>Logo</header>; }",
  };

  const formatted = formatSingleCodeFile(sampleFile, {
    rootFolderName: "my-project",
  });

  // 1) Metadata on top:
  assert.ok(formatted.includes("FILE LOCATION: src/components/Header.tsx"));
  assert.ok(formatted.includes("FILE NAME: Header.tsx"));
  assert.ok(formatted.includes("FILE TYPE: tsx (TypeScript React)"));

  // 2) Actual code:
  assert.ok(
    formatted.includes(
      "export function Header() { return <header>Logo</header>; }",
    ),
  );

  // 3) End indicator:
  assert.ok(formatted.includes("END OF FILE: src/components/Header.tsx"));

  // Verify ordering: metadata appears before code, which appears before end
  const metaPos = formatted.indexOf("FILE LOCATION:");
  const codePos = formatted.indexOf("export function Header");
  const endPos = formatted.indexOf("END OF FILE:");

  assert.ok(metaPos < codePos);
  assert.ok(codePos < endPos);
});

test("combineMultipleCodeFiles combines multiple files into one single text file", () => {
  const combined = combineMultipleCodeFiles(sampleBundle, {
    rootFolderName: "app",
  });

  // Header contains summary
  assert.ok(combined.includes("TOTAL FILES INCLUDED: 2"));
  assert.ok(combined.includes("TABLE OF CONTENTS:"));

  // First file structure
  assert.ok(combined.includes("FILE LOCATION: public/index.html"));
  assert.ok(combined.includes("<!DOCTYPE html><html><body>App</body></html>"));
  assert.ok(combined.includes("END OF FILE: public/index.html"));

  // Second file structure
  assert.ok(combined.includes("FILE LOCATION: src/app.js"));
  assert.ok(combined.includes('console.log("running");'));
  assert.ok(combined.includes("END OF FILE: src/app.js"));
});

test("countLines and estimateTokens calculate metrics correctly", () => {
  const code = "line 1\nline 2\nline 3";
  assert.equal(countLines(code), 3);
  assert.ok(estimateTokens(code) > 0);
});

test("getRelativePathFromRoot strips the root folder segment", () => {
  assert.equal(
    getRelativePathFromRoot(sampleBundle[0], "app"),
    "public/index.html",
  );
  assert.equal(getRelativePathFromRoot(sampleBundle[1], ""), "app/src/app.js");
});

test("xml style wraps content in CDATA and escapes ]]> sequences", () => {
  const file: ProcessedFile = {
    id: "x1",
    name: "Component.tsx",
    originalName: "Component.tsx",
    flattenedName: "Component.tsx",
    relativePath: "proj/src/Component.tsx",
    pathSegments: ["proj", "src", "Component.tsx"],
    directoryPath: "src",
    size: 60,
    type: "text/typescript",
    extension: "tsx",
    lastModified: 1700000000000,
    textContent: 'const a = "</file>";\nconst b = "]]>";',
  };

  const out = formatSingleCodeFile(file, {
    style: "xml",
    rootFolderName: "proj",
  });

  // Metadata lives in attributes on the <file> element
  assert.ok(out.includes('<file path="src/Component.tsx"'));
  assert.ok(out.includes('type="tsx"'));

  // Content is CDATA-wrapped so TSX/HTML cannot corrupt the document
  assert.ok(out.includes("<![CDATA["));
  assert.ok(out.includes('const a = "</file>";'));

  // Literal ]]> inside content is split with the standard escape trick
  assert.ok(out.includes('const b = "]]]]><![CDATA[>";'));

  assert.ok(out.includes("</file>"));
});

test("xml style escapes special characters in attribute values", () => {
  const file: ProcessedFile = {
    ...sampleBundle[1],
    name: 'a"b&c.js',
    relativePath: 'app/src/a"b&c.js',
  };
  const out = formatSingleCodeFile(file, {
    style: "xml",
    rootFolderName: "app",
  });
  assert.ok(out.includes('name="a&quot;b&amp;c.js"'));
  assert.ok(!out.includes('name="a"b&c.js"'));
});

test("xml combine wraps files in a root <codebase> element", () => {
  const combined = combineMultipleCodeFiles(sampleBundle, {
    style: "xml",
    rootFolderName: "app",
  });
  assert.ok(combined.startsWith('<codebase root="app" fileCount="2"'));
  assert.ok(combined.includes("</codebase>"));
  assert.ok(combined.includes("<![CDATA["));
  assert.ok(combined.includes('console.log("running");'));
});

test("jsonl combine emits a metadata record then one parseable record per file", () => {
  const combined = combineMultipleCodeFiles(sampleBundle, {
    style: "jsonl",
    rootFolderName: "app",
  });

  const lines = combined.trim().split("\n");
  assert.equal(lines.length, 3);

  const meta = JSON.parse(lines[0]);
  assert.equal(meta.recordType, "metadata");
  assert.equal(meta.rootFolder, "app");
  assert.equal(meta.fileCount, 2);
  assert.deepEqual(meta.files, ["public/index.html", "src/app.js"]);

  const rec1 = JSON.parse(lines[1]);
  assert.equal(rec1.recordType, "file");
  assert.equal(rec1.path, "public/index.html");
  assert.equal(rec1.name, "index.html");
  assert.equal(rec1.fileType, "html");
  assert.equal(rec1.content, "<!DOCTYPE html><html><body>App</body></html>");
  assert.equal(rec1.lines, 1);

  const rec2 = JSON.parse(lines[2]);
  assert.equal(rec2.path, "src/app.js");
  assert.equal(rec2.language, "JavaScript");
  assert.equal(rec2.content, 'console.log("running");');
});

test("jsonl formatSingleCodeFile returns a single parseable line", () => {
  const out = formatSingleCodeFile(sampleBundle[0], {
    style: "jsonl",
    rootFolderName: "app",
  });
  const record = JSON.parse(out.trim());
  assert.equal(record.recordType, "file");
  assert.equal(record.path, "public/index.html");
});

test("compact style emits only a path header plus pristine code", () => {
  const combined = combineMultipleCodeFiles(sampleBundle, {
    style: "compact",
    rootFolderName: "app",
  });

  assert.ok(combined.includes("# ---- public/index.html ----"));
  assert.ok(combined.includes("# ---- src/app.js ----"));
  assert.ok(combined.includes("<!DOCTYPE html><html><body>App</body></html>"));
  assert.ok(combined.includes('console.log("running");'));

  // None of the standard document chrome
  assert.ok(!combined.includes("FILE LOCATION:"));
  assert.ok(!combined.includes("END OF FILE:"));
  assert.ok(!combined.includes("========"));
  assert.ok(!combined.includes("TABLE OF CONTENTS"));
});

test("compact style ignores line numbers to stay token-efficient", () => {
  const combined = combineMultipleCodeFiles(sampleBundle, {
    style: "compact",
    includeLineNumbers: true,
    rootFolderName: "app",
  });
  assert.ok(!combined.includes("1 | "));
});

test("markdown combine uses a markdown-native document header", () => {
  const combined = combineMultipleCodeFiles(sampleBundle, {
    style: "markdown",
    rootFolderName: "app",
  });
  assert.ok(
    combined.includes("# Codefile Analyzer: Combined Project Codebase Archive"),
  );
  assert.ok(combined.includes("## Table of Contents"));
  assert.ok(combined.includes("### File: index.html"));
  assert.ok(combined.includes("```html"));
  assert.ok(combined.includes("<!-- END OF FILE: public/index.html -->"));
});
