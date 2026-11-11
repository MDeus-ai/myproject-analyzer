/**
 * Pluggable reader for filesystem-path-backed file content.
 *
 * packages/core must stay platform-agnostic (it runs in browsers, in the
 * Electron main process, in the Electron renderer, and in Node tests), so
 * it can never import the platform bridge. Instead, the active platform
 * registers a PathTextReader once at app boot:
 *
 *   - web:        registers nothing (all files are blob-backed)
 *   - desktop:    ElectronPlatformBridge registers an IPC-backed reader
 *   - node tests: may register an fs-based reader
 */

export interface PathTextReader {
  /**
   * Reads a file from disk as text, applying the SAME readability gates
   * as the web reader: extension/filename allowlist first, binary-MIME
   * early exit, NUL-byte content sniff, and the MAX_TEXT_READ_SIZE cap.
   * Returns undefined for binaries / oversized / unreadable files, so
   * callers keep rendering getMissingContentReason() exactly as today.
   */
  readPathText(
    absolutePath: string,
    fileName: string,
    mimeType: string,
  ): Promise<string | undefined>;
}

let activeReader: PathTextReader | null = null;

export function setPathTextReader(reader: PathTextReader | null): void {
  activeReader = reader;
}

export function getPathTextReader(): PathTextReader | null {
  return activeReader;
}
