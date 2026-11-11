/**
 * Platform bridge registry.
 *
 * The composition root lives in each APP (apps/web, apps/desktop): the app
 * constructs the right implementation at boot and registers it here. This
 * package deliberately contains no factory importing either implementation,
 * so the web bundle never sees Electron code and vice versa.
 */

import type { PlatformBridge } from "./types";

export * from "./types";

let activeBridge: PlatformBridge | null = null;

export function setPlatform(bridge: PlatformBridge): void {
  if (activeBridge) {
    console.warn("[platform] bridge replaced (expected only in tests)");
  }
  activeBridge = bridge;
}

export function getPlatform(): PlatformBridge {
  if (!activeBridge) {
    throw new Error(
      "[platform] No platform bridge registered. Call setPlatform() during app boot.",
    );
  }
  return activeBridge;
}

export function hasPlatform(): boolean {
  return activeBridge !== null;
}

/** True when running inside the Electron desktop shell (preload injected). */
export function isElectronRuntime(): boolean {
  return typeof window !== "undefined" && "mpBridge" in window;
}
