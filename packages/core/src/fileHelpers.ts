/**
 * Utility functions for file size formatting, extensions, and categories.
 */

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1 && parts[0] !== '') {
    return parts.pop()?.toLowerCase() || '';
  }
  // Handle files like .gitignore or files with no extension
  if (filename.startsWith('.') && parts.length === 2) {
    return filename.slice(1).toLowerCase();
  }
  return '';
}

export type FileCategory =
  | 'code'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'archive'
  | 'data'
  | 'font'
  | 'other';

export function getFileCategory(filename: string, mimeType?: string): FileCategory {
  const ext = getFileExtension(filename);

  const codeExts = [
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'json', 'yaml', 'yml',
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php',
    'sh', 'bash', 'zsh', 'sql', 'graphql', 'xml', 'toml', 'env', 'md', 'mdx'
  ];
  if (codeExts.includes(ext)) return 'code';

  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'avif'];
  if (imageExts.includes(ext) || mimeType?.startsWith('image/')) return 'image';

  const docExts = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'pages', 'epub'];
  if (docExts.includes(ext) || mimeType?.includes('pdf') || mimeType?.includes('document')) return 'document';

  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
  if (audioExts.includes(ext) || mimeType?.startsWith('audio/')) return 'audio';

  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
  if (videoExts.includes(ext) || mimeType?.startsWith('video/')) return 'video';

  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'];
  if (archiveExts.includes(ext) || mimeType?.includes('zip') || mimeType?.includes('compressed')) return 'archive';

  const dataExts = ['csv', 'tsv', 'xlsx', 'xls', 'parquet', 'db', 'sqlite'];
  if (dataExts.includes(ext)) return 'data';

  const fontExts = ['woff', 'woff2', 'ttf', 'otf', 'eot'];
  if (fontExts.includes(ext)) return 'font';

  return 'other';
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const d = new Date(timestamp);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}
