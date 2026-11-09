/**
 * Robust clipboard helper.
 *
 * Why this exists: the async Clipboard API (`navigator.clipboard`) is only
 * exposed in secure contexts (https:// or http://localhost). The Vite dev
 * script runs with `--host=0.0.0.0`, so the app is frequently opened through
 * a LAN address such as http://192.168.x.x:3000 where `window.isSecureContext`
 * is false and `navigator.clipboard` is undefined. Calling
 * `navigator.clipboard.writeText(...)` there throws immediately and the copy
 * buttons silently do nothing.
 *
 * This helper tries the modern API first and transparently falls back to a
 * hidden textarea + `document.execCommand('copy')`, which still works in
 * insecure contexts. It resolves to `true` when the text reached the clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Preferred path: modern async clipboard (requires a secure context).
  if (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied / document not focused -> fall through to legacy path.
    }
  }

  // Fallback path: temporary textarea + execCommand('copy').
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    const previouslyFocused = document.activeElement as HTMLElement | null;

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length); // iOS Safari

    const succeeded = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }

    if (!succeeded) {
      console.warn('[clipboard] execCommand("copy") returned false');
    }
    return succeeded;
  } catch (err) {
    console.error("[clipboard] Unable to copy text:", err);
    return false;
  }
}
