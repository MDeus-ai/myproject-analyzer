import path from "node:path";
import { sanitizeSmartPastePath } from "@myproject/core/smartPaste";
import type { ApplyChangeIpcFile } from "@myproject/platform/bridge";

export interface PlannedChange {
  /** Safe POSIX path relative to the project root. */
  rel: string;
  /** Resolved absolute path — guaranteed inside root. */
  abs: string;
  action: "modify" | "create" | "delete";
  content: string;
}

/**
 * Converts renderer-supplied changes into a safe write plan.
 * Defense in depth: the parser already sanitizes paths; we sanitize AGAIN
 * here and then verify containment, so nothing the renderer sends can make
 * main write outside the picked project root.
 */
export function planApplyChanges(
  rootPath: string,
  changes: ApplyChangeIpcFile[],
): { plan: PlannedChange[]; errors: string[] } {
  const root = path.resolve(rootPath);
  const plan: PlannedChange[] = [];
  const errors: string[] = [];

  for (const change of changes) {
    const rel = sanitizeSmartPastePath(change?.path ?? "");
    if (!rel) {
      errors.push(`Rejected unsafe or empty path: "${change?.path}"`);
      continue;
    }
    if (!["modify", "create", "delete"].includes(change.action)) {
      errors.push(`Rejected unknown action "${change.action}" for ${rel}`);
      continue;
    }
    const abs = path.resolve(root, rel);
    const relToRoot = path.relative(root, abs);
    if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) {
      errors.push(`Rejected path escaping the project root: "${change.path}"`);
      continue;
    }
    plan.push({
      rel,
      abs,
      action: change.action,
      content: change.content ?? "",
    });
  }

  return { plan, errors };
}
