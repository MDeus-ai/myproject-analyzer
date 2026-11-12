import path from "node:path";
import {
  isGitignored,
  type GitignoreRule,
} from "@myproject/core/gitignoreParser";

export type WatchIgnoredPredicate = (absolutePath: string) => boolean;

/**
 * Builds the chokidar `ignored` predicate for a watch session.
 *
 * CRITICAL: the watched ROOT itself must never be ignored. Chokidar consults
 * this predicate for every path it touches — including the root — and
 * ignoring the root disables the entire watcher (zero events, no error).
 */
export function buildWatchIgnored(
  rootPath: string,
  heavySegments: ReadonlySet<string>,
  gitignoreRules: GitignoreRule[],
): WatchIgnoredPredicate {
  const root = path.resolve(rootPath);
  return (testPath: string): boolean => {
    const rel = path.relative(root, testPath).split(path.sep).join("/");
    if (!rel) return false; // the root itself — never ignore
    if (rel.startsWith("..")) return true; // outside the root
    if (rel.split("/").some((seg) => heavySegments.has(seg.toLowerCase()))) {
      return true;
    }
    if (gitignoreRules.length > 0 && isGitignored(rel, gitignoreRules)) {
      return true;
    }
    return false;
  };
}
