/**
 * Detects files that commonly contain secrets/credentials.
 * These files are flagged with a warning because users often paste
 * analyzer output directly into AI chats.
 */

/**
 * Returns true if the file is likely to contain real secrets.
 * Template files (.env.example, .env.sample) are considered safe.
 */
export function isSecretFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  // Safe templates — no real credentials
  if (
    lower === ".env.example" ||
    lower === ".env.sample" ||
    lower === ".env.template"
  ) {
    return false;
  }
  // .env, .env.local, .env.production, .env.development, etc.
  if (lower === ".env" || lower.startsWith(".env.")) {
    return true;
  }
  // Other common secret-bearing files
  const SECRET_NAMES = [
    "credentials.json",
    "secrets.json",
    "secrets.yaml",
    "secrets.yml",
    "secrets.txt",
    "service-account.json",
    "firebase-adminsdk.json",
  ];
  if (SECRET_NAMES.includes(lower)) return true;
  return false;
}

/** Returns a user-friendly warning message for secret files. */
export function getSecretWarning(filenames: string[]): string {
  if (filenames.length === 0) return "";
  const preview = filenames.slice(0, 3).join(", ");
  const suffix = filenames.length > 3 ? ` +${filenames.length - 3} more` : "";
  return `${filenames.length} file(s) may contain secrets: ${preview}${suffix}. These will be included in the export — review before pasting into AI chats.`;
}
