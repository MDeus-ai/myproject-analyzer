ADR 003: PlatformBridge host abstraction
Status
Accepted (Phase 0)

Context
Desktop-only capabilities (folder watching, native dialogs, writing to disk) must reach the shared UI without if (isElectron) scattered through components, and without Electron APIs leaking into code that also runs in a browser.

Decision
A single PlatformBridge interface in packages/platform, with one implementation per host:

WebPlatformBridge — today's exact browser code paths (webkitdirectory input, drag-and-drop, blob URLs, browser downloads).
ElectronPlatformBridge — Phase 1, IPC-backed.
The composition root lives in each app: apps/web/src/platform.ts calls setPlatform(new WebPlatformBridge()) at boot. Desktop will do the same with its bridge. The registry (getPlatform) throws if unset, surfacing boot-order bugs immediately.

Capabilities the web physically lacks (watch, applyToDisk, saveToPath, nativeDialogs) are optional methods + boolean capability flags, so shared UI degrades explicitly (capabilities.watch ? ... : ...) instead of sniffing user agents.

Consequences
Adding a desktop feature = extend the interface + implement in the Electron bridge; web simply never sets the capability flag.
isElectronRuntime() exists for the rare genuinely-runtime check (e.g. title bar chrome), kept to a single helper.
Tests can register a mock bridge to exercise platform-aware UI.
