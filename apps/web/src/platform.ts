/**
 * Platform composition root — SHARED by web and desktop (the desktop shell
 * loads this same renderer). Registers the right bridge before React
 * renders, so getPlatform() always has an implementation.
 *
 * Electron: preload injected window.myprojectDesktop -> native bridge, plus
 * the IPC-backed PathTextReader for path-backed files (ADR-002).
 * Web: browser bridge; all files are blob-backed, no reader needed.
 */
import { isElectronRuntime, setPlatform } from "@myproject/platform";
import { WebPlatformBridge } from "@myproject/platform-web";
import { ElectronPlatformBridge } from "@myproject/platform-electron";
import { setPathTextReader } from "@myproject/core/contentReader";

if (isElectronRuntime()) {
  const host = window.myprojectDesktop!;
  setPlatform(new ElectronPlatformBridge(host));
  setPathTextReader({
    readPathText: async (absolutePath) =>
      (await host.readFileText(absolutePath)) ?? undefined,
  });
} else {
  setPlatform(new WebPlatformBridge());
}
