import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface WalkedEntry {
  absPath: string;
  relPath: string; // posix, relative to walked root, no root prefix
  name: string;
  size: number;
  mtimeMs: number;
}

export interface WalkOptions {
  maxFiles?: number;
  maxDepth?: number;
}

const DEFAULT_MAX_FILES = 100_000;
const DEFAULT_MAX_DEPTH = 40;

/**
 * Recursive folder walk for the native scan.
 * - never follows symlinks (kills cycle risk)
 * - tolerates unreadable entries (Windows EPERM) by skipping, not failing
 * - caps file count and depth as runaway protection
 */
export async function walkFiles(
  rootPath: string,
  opts: WalkOptions = {},
): Promise<WalkedEntry[]> {
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const root = path.resolve(rootPath);
  const out: WalkedEntry[] = [];

  async function visit(
    dir: string,
    relDir: string,
    depth: number,
  ): Promise<void> {
    if (out.length >= maxFiles || depth > maxDepth) return;

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // EPERM / ENOENT — skip, don't kill the scan
    }

    for (const ent of entries) {
      if (out.length >= maxFiles) return;
      if (ent.isSymbolicLink()) continue;

      const abs = path.join(dir, ent.name);
      const rel = relDir ? `${relDir}/${ent.name}` : ent.name;

      if (ent.isDirectory()) {
        await visit(abs, rel, depth + 1);
        continue;
      }

      if (ent.isFile()) {
        try {
          const st = await stat(abs);
          out.push({
            absPath: abs,
            relPath: rel,
            name: ent.name,
            size: st.size,
            mtimeMs: st.mtimeMs,
          });
        } catch {
          // raced deletion / locked file — skip
        }
      }
    }
  }

  await visit(root, "", 0);
  return out;
}
