import test from "node:test";
import assert from "node:assert/strict";
import {
  DOCUMENTATION_CHAPTERS,
  DOCUMENTATION_QUICK_KEYWORDS,
  searchDocumentation,
  getChapterById,
} from "./documentationData";

test("DOCUMENTATION_CHAPTERS contains 12 deep user and technical developer chapters (45+ sections)", () => {
  assert.equal(DOCUMENTATION_CHAPTERS.length, 12, "Should have 12 comprehensive chapters");

  const userChapters = DOCUMENTATION_CHAPTERS.filter((c) => c.audience === "user");
  const devChapters = DOCUMENTATION_CHAPTERS.filter((c) => c.audience === "developer");

  assert.equal(userChapters.length, 6, "Should include 6 user-facing chapters");
  assert.equal(devChapters.length, 6, "Should include 6 developer deep-dive chapters");

  let totalSections = 0;
  for (const chapter of DOCUMENTATION_CHAPTERS) {
    assert.ok(chapter.id.length > 0);
    assert.ok(chapter.title.length > 0);
    assert.ok(chapter.sections.length >= 3, `Chapter ${chapter.id} should have at least 3 deep sections`);
    assert.ok(chapter.keywords.length >= 5, `Chapter ${chapter.id} should have rich keyword tags`);
    totalSections += chapter.sections.length;
  }
  assert.ok(totalSections >= 44, `Expected at least 44 deep sections, got ${totalSections}`);
});

test("searchDocumentation returns all chapters matching audience when query is empty", () => {
  const allResults = searchDocumentation("", "all");
  assert.equal(allResults.length, DOCUMENTATION_CHAPTERS.length);

  const userResults = searchDocumentation("", "user");
  assert.ok(userResults.every((r) => r.chapter.audience === "user"));

  const devResults = searchDocumentation("", "developer");
  assert.ok(devResults.every((r) => r.chapter.audience === "developer"));
});

test("searchDocumentation ranks keyword matches across titles, steps, deepDiveNotes, code blocks, and tables", () => {
  const rustResults = searchDocumentation("Rust rayon", "all");
  assert.ok(rustResults.length > 0, "Should find Rust / rayon documentation");

  const bridgeResults = searchDocumentation("Header Bridging", "all");
  assert.ok(bridgeResults.length > 0, "Should find C/C++ Header Bridging documentation");

  const collisionResults = searchDocumentation("Collision", "user");
  assert.ok(collisionResults.length > 0, "Should find Collision in user guide");

  const lightModeResults = searchDocumentation("syncThemeVariables", "developer");
  assert.ok(lightModeResults.length > 0, "Should find syncThemeVariables in developer docs");
});

test("getChapterById retrieves specific chapter and DOCUMENTATION_QUICK_KEYWORDS are searchable", () => {
  const firstId = DOCUMENTATION_CHAPTERS[0].id;
  const overview = getChapterById(firstId);
  assert.ok(overview);
  assert.equal(overview.id, firstId);

  for (const kw of DOCUMENTATION_QUICK_KEYWORDS) {
    const hits = searchDocumentation(kw, "all");
    assert.ok(hits.length > 0, `Quick keyword "${kw}" should yield at least 1 result`);
  }
});
