import { ProcessedFile } from "@myproject/core/types";

/**
 * Parses .gitignore content and matches file paths against its rules.
 * Supports the common gitignore syntax subset:
 * - Comments (#) and blank lines
 * - Negation (!)
 * - Directory-only patterns (trailing /)
 * - Anchored patterns (leading / or containing /)
 * - Wildcards: * (within a segment), ? (single char), ** (across segments)
 *
 * GIT SEMANTICS: real git cannot re-include a file when a parent DIRECTORY
 * of that file is excluded — git simply never descends into it. So:
 *   temp/  + !important.dat   -> temp/important.dat stays IGNORED
 *   temp/* + !important.dat   -> temp/important.dat SURVIVES (only the
 *                                directory's contents were excluded)
 * This parser mirrors that: ancestor directory exclusion is terminal.
 */

export interface GitignoreRule {
  pattern: string;
  negated: boolean;
  directoryOnly: boolean;
  anchored: boolean;
  /** Precompiled matcher — compiled once at parse time, not per file. */
  regex: RegExp;
}

export function parseGitignore(content: string): GitignoreRule[] {
  const rules: GitignoreRule[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    if (rawLine.startsWith("#")) continue;
    let line = rawLine.replace(/\s+$/, "");
    if (!line) continue;

    let negated = false;
    if (line.startsWith("!")) {
      negated = true;
      line = line.slice(1);
    }
    if (!line) continue;

    let directoryOnly = false;
    if (line.endsWith("/")) {
      directoryOnly = true;
      line = line.slice(0, -1);
    }

    let anchored = false;
    if (line.startsWith("/")) {
      anchored = true;
      line = line.slice(1);
    } else if (line.includes("/")) {
      anchored = true;
    }
    if (!line) continue;

    rules.push({
      pattern: line,
      negated,
      directoryOnly,
      anchored,
      regex: globToRegex(line, anchored),
    });
  }

  return rules;
}

function globToRegex(pattern: string, anchored: boolean): RegExp {
  let re = "";
  let i = 0;

  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i += 2;
      } else {
        re += "[^/]*";
        i += 1;
      }
    } else if (c === "?") {
      re += "[^/]";
      i += 1;
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += "\\" + c;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }

  if (anchored) {
    return new RegExp("^" + re + "$");
  }
  return new RegExp("(^|.*/)" + re + "$");
}

/**
 * Last-match-wins evaluation of a single path against all rules.
 * `isDir` must be true when the path is being tested as a directory
 * (enables directoryOnly rules like `logs/`).
 */
function lastMatchingRule(
  path: string,
  rules: GitignoreRule[],
  isDir: boolean,
): GitignoreRule | null {
  let match: GitignoreRule | null = null;
  for (const rule of rules) {
    if (rule.directoryOnly && !isDir) continue;
    if (rule.regex.test(path)) match = rule;
  }
  return match;
}

/**
 * Returns the rule that decides a path's fate, or null if no rule applies.
 * The caller checks `rule.negated`: a non-negated deciding rule means the
 * path is ignored, a negated one means it was explicitly re-included.
 *
 * Ancestor directories are checked first: if any ancestor dir is ignored,
 * git never descends into it, so the file is ignored regardless of
 * negations that would match the file itself.
 */
export function matchGitignore(
  path: string,
  rules: GitignoreRule[],
): GitignoreRule | null {
  const normalizedPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedPath) return null;

  const segments = normalizedPath.split("/");

  // Ancestor-directory exclusion is terminal (git never descends).
  for (let i = 1; i < segments.length; i++) {
    const dirPath = segments.slice(0, i).join("/");
    const rule = lastMatchingRule(dirPath, rules, true);
    if (rule && !rule.negated) return rule;
  }

  return lastMatchingRule(normalizedPath, rules, false);
}

export function isGitignored(path: string, rules: GitignoreRule[]): boolean {
  const rule = matchGitignore(path, rules);
  return rule !== null && !rule.negated;
}

/** Finds and parses the root .gitignore from a list of processed files. */
export function extractGitignoreRules(
  files: ProcessedFile[],
  rootFolderName: string,
): GitignoreRule[] {
  const gitignoreFile = files.find((f) => {
    const normalized = f.relativePath.replace(/\\/g, "/");
    return (
      normalized === `${rootFolderName}/.gitignore` ||
      normalized === ".gitignore"
    );
  });

  if (gitignoreFile?.textContent) {
    return parseGitignore(gitignoreFile.textContent);
  }
  return [];
}

/** Strips the root folder prefix from a relative path. */
export function stripRootFolder(path: string, rootFolderName: string): string {
  let rel = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (rootFolderName && rel.startsWith(rootFolderName + "/")) {
    rel = rel.slice(rootFolderName.length + 1);
  }
  return rel;
}

/**
 * Filters files by gitignore rules, returning the kept files plus every
 * removed file tagged with the exact rule pattern that removed it — the
 * review modal groups these by rule so users can see (and optionally
 * re-include) every single removal.
 */
export function filterFilesByGitignore(
  files: ProcessedFile[],
  rules: GitignoreRule[],
  rootFolderName: string,
): {
  filteredFiles: ProcessedFile[];
  totalSkipped: number;
  removed: { file: ProcessedFile; pattern: string }[];
} {
  if (rules.length === 0) {
    return { filteredFiles: files, totalSkipped: 0, removed: [] };
  }

  const filteredFiles: ProcessedFile[] = [];
  const removed: { file: ProcessedFile; pattern: string }[] = [];

  for (const file of files) {
    const relPath = stripRootFolder(file.relativePath, rootFolderName);
    if (relPath === ".gitignore") {
      filteredFiles.push(file); // never exclude .gitignore itself
      continue;
    }
    const rule = matchGitignore(relPath, rules);
    if (rule && !rule.negated) {
      removed.push({ file, pattern: rule.pattern });
    } else {
      filteredFiles.push(file);
    }
  }

  return { filteredFiles, totalSkipped: removed.length, removed };
}
