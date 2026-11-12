/**
 * Custom protocol (`myproject-asset://`) URL parsing and root-containment
 * validation for desktop image previews.
 *
 * Kept pure (no Electron imports) so the security boundary can be
 * unit-tested directly under Node's test runner.
 */
import path from "node:path";

export const ASSET_PROTOCOL_SCHEME = "myproject-asset";

export function isPathUnderAllowedRoots(
  candidatePath: string,
  allowedRoots: Iterable<string>,
): boolean {
  if (!candidatePath || typeof candidatePath !== "string") return false;
  const resolved = path.resolve(candidatePath);
  for (const root of allowedRoots) {
    const resolvedRoot = path.resolve(root);
    const rel = path.relative(resolvedRoot, resolved);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts and validates the local file path from a `myproject-asset://` request URL.
 * Returns the resolved absolute path when it lies inside one of `allowedRoots`,
 * or `null` if the URL is malformed or escapes the allowed roots.
 */
export function resolveAllowedAssetUrl(
  requestUrl: string,
  allowedRoots: Iterable<string>,
): string | null {
  try {
    const parsed = new URL(requestUrl);
    if (parsed.protocol !== `${ASSET_PROTOCOL_SCHEME}:`) return null;
    const rawPath = parsed.searchParams.get("path");
    if (!rawPath) return null;
    if (!isPathUnderAllowedRoots(rawPath, allowedRoots)) return null;
    return path.resolve(rawPath);
  } catch {
    return null;
  }
}
