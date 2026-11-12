/**
 * URL policy for navigation guards and external opens.
 * Pure functions — unit-tested, then wired into main.ts.
 */

/** Schemes the app may hand to the OS (system browser / mail client). */
const SAFE_EXTERNAL_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

/**
 * True when a URL is safe to pass to shell.openExternal.
 * Rejects blob:, file:, javascript:, data: and custom protocol handlers —
 * openExternal on those can launch arbitrary handler applications.
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    return SAFE_EXTERNAL_PROTOCOLS.has(new URL(rawUrl).protocol);
  } catch {
    return false; // malformed URL — deny
  }
}

/**
 * True when a navigation target is the dev-server origin (scheme + host +
 * port must match exactly — localhost:3000 and a LAN IP on :3000 are
 * DIFFERENT origins, which is what we want).
 */
export function isDevServerUrl(rawUrl: string, devServerUrl: string): boolean {
  try {
    return new URL(rawUrl).origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
}
