import { ProcessedFile } from '../types';
import { formatBytes, getFileExtension } from './fileHelpers';

export interface CodeLanguageInfo {
  isCode: boolean;
  language: string;
  fileType: string;
  category: string;
}

const EXTENSION_MAP: Record<string, { language: string; fileType: string; category: string }> = {
  // Web & UI
  html: { language: 'HTML', fileType: 'html', category: 'web' },
  htm: { language: 'HTML', fileType: 'html', category: 'web' },
  xhtml: { language: 'XHTML', fileType: 'xhtml', category: 'web' },
  tsx: { language: 'TypeScript React', fileType: 'tsx', category: 'frontend' },
  jsx: { language: 'JavaScript React', fileType: 'jsx', category: 'frontend' },
  ts: { language: 'TypeScript', fileType: 'ts', category: 'scripting' },
  js: { language: 'JavaScript', fileType: 'js', category: 'scripting' },
  mjs: { language: 'JavaScript (ESM)', fileType: 'mjs', category: 'scripting' },
  cjs: { language: 'JavaScript (CommonJS)', fileType: 'cjs', category: 'scripting' },
  vue: { language: 'Vue Component', fileType: 'vue', category: 'frontend' },
  svelte: { language: 'Svelte Component', fileType: 'svelte', category: 'frontend' },
  css: { language: 'CSS Stylesheet', fileType: 'css', category: 'styling' },
  scss: { language: 'SCSS Stylesheet', fileType: 'scss', category: 'styling' },
  sass: { language: 'SASS Stylesheet', fileType: 'sass', category: 'styling' },
  less: { language: 'LESS Stylesheet', fileType: 'less', category: 'styling' },

  // Systems & Backend
  py: { language: 'Python', fileType: 'py', category: 'backend' },
  go: { language: 'Go', fileType: 'go', category: 'backend' },
  rs: { language: 'Rust', fileType: 'rs', category: 'systems' },
  java: { language: 'Java', fileType: 'java', category: 'backend' },
  c: { language: 'C Source', fileType: 'c', category: 'systems' },
  cpp: { language: 'C++ Source', fileType: 'cpp', category: 'systems' },
  cc: { language: 'C++ Source', fileType: 'cc', category: 'systems' },
  cxx: { language: 'C++ Source', fileType: 'cxx', category: 'systems' },
  h: { language: 'C/C++ Header', fileType: 'h', category: 'systems' },
  hpp: { language: 'C++ Header', fileType: 'hpp', category: 'systems' },
  cs: { language: 'C#', fileType: 'cs', category: 'backend' },
  php: { language: 'PHP', fileType: 'php', category: 'backend' },
  rb: { language: 'Ruby', fileType: 'rb', category: 'backend' },
  swift: { language: 'Swift', fileType: 'swift', category: 'mobile' },
  kt: { language: 'Kotlin', fileType: 'kt', category: 'mobile' },
  kts: { language: 'Kotlin Script', fileType: 'kts', category: 'scripting' },
  dart: { language: 'Dart', fileType: 'dart', category: 'mobile' },
  scala: { language: 'Scala', fileType: 'scala', category: 'backend' },
  clj: { language: 'Clojure', fileType: 'clj', category: 'backend' },
  ex: { language: 'Elixir', fileType: 'ex', category: 'backend' },
  exs: { language: 'Elixir Script', fileType: 'exs', category: 'scripting' },
  lua: { language: 'Lua', fileType: 'lua', category: 'scripting' },
  pl: { language: 'Perl', fileType: 'pl', category: 'scripting' },
  r: { language: 'R Script', fileType: 'r', category: 'data' },

  // Shell & Scripts
  sh: { language: 'Shell Script', fileType: 'sh', category: 'scripting' },
  bash: { language: 'Bash Script', fileType: 'bash', category: 'scripting' },
  zsh: { language: 'Zsh Script', fileType: 'zsh', category: 'scripting' },
  fish: { language: 'Fish Script', fileType: 'fish', category: 'scripting' },
  ps1: { language: 'PowerShell', fileType: 'ps1', category: 'scripting' },
  bat: { language: 'Batch Script', fileType: 'bat', category: 'scripting' },
  cmd: { language: 'CMD Script', fileType: 'cmd', category: 'scripting' },

  // Configuration & Data
  json: { language: 'JSON Data', fileType: 'json', category: 'config' },
  json5: { language: 'JSON5 Data', fileType: 'json5', category: 'config' },
  yaml: { language: 'YAML Configuration', fileType: 'yaml', category: 'config' },
  yml: { language: 'YAML Configuration', fileType: 'yml', category: 'config' },
  toml: { language: 'TOML Configuration', fileType: 'toml', category: 'config' },
  xml: { language: 'XML Document', fileType: 'xml', category: 'data' },
  sql: { language: 'SQL Database Script', fileType: 'sql', category: 'database' },
  graphql: { language: 'GraphQL Schema/Query', fileType: 'graphql', category: 'api' },
  gql: { language: 'GraphQL Schema/Query', fileType: 'gql', category: 'api' },
  proto: { language: 'Protocol Buffers', fileType: 'proto', category: 'api' },
  env: { language: 'Environment Configuration', fileType: 'env', category: 'config' },

  // Documentation & Text
  md: { language: 'Markdown Document', fileType: 'md', category: 'docs' },
  mdx: { language: 'MDX Document', fileType: 'mdx', category: 'docs' },
  txt: { language: 'Plain Text', fileType: 'txt', category: 'docs' },
  csv: { language: 'Comma Separated Values', fileType: 'csv', category: 'data' },
  tsv: { language: 'Tab Separated Values', fileType: 'tsv', category: 'data' },
};

/**
 * Identifies whether a file is a source code/configuration file and returns detailed metadata.
 */
export function identifyCodeFileType(filename: string): CodeLanguageInfo {
  const ext = getFileExtension(filename).toLowerCase();

  // Special full-name matches
  const lowerName = filename.toLowerCase();
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) {
    return { isCode: true, language: 'Dockerfile', fileType: 'dockerfile', category: 'devops' };
  }
  if (lowerName === 'makefile' || lowerName === 'gnumakefile') {
    return { isCode: true, language: 'Makefile', fileType: 'makefile', category: 'devops' };
  }
  if (lowerName.startsWith('.env')) {
    return { isCode: true, language: 'Environment Configuration', fileType: 'env', category: 'config' };
  }

  const match = EXTENSION_MAP[ext];
  if (match) {
    return {
      isCode: true,
      language: match.language,
      fileType: match.fileType,
      category: match.category,
    };
  }

  return {
    isCode: false,
    language: ext ? ext.toUpperCase() : 'Unknown',
    fileType: ext || 'unknown',
    category: 'other',
  };
}

export interface AnalyzerFormatOptions {
  style?: 'standard' | 'markdown' | 'xml';
  includeLineNumbers?: boolean;
  rootFolderName?: string;
  addTableOfContents?: boolean;
}

/**
 * Counts total lines in a string of code.
 */
export function countLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * Simple approximation of token count (~4 characters per token).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Formats a single file with:
 * 1) Metadata on top (Location from root, File Name, File Type)
 * 2) File's actual contents (code)
 * 3) Indication of file's end
 */
export function formatSingleCodeFile(
  file: ProcessedFile,
  options: AnalyzerFormatOptions = {}
): string {
  const { style = 'standard', includeLineNumbers = false, rootFolderName = '' } = options;
  const meta = identifyCodeFileType(file.name);

  // Compute location from root folder
  let relativeFromRoot = file.relativePath.replace(/^[\\/]+/, '').replace(/\\/g, '/');
  if (rootFolderName && relativeFromRoot.startsWith(rootFolderName + '/')) {
    relativeFromRoot = relativeFromRoot.slice(rootFolderName.length + 1);
  }

  const content = file.textContent ?? '(Empty or binary content not available for text export)';
  const linesCount = countLines(content);

  let formattedCode = content;
  if (includeLineNumbers && content) {
    const lines = content.split('\n');
    const padLength = String(lines.length).length;
    formattedCode = lines
      .map((line, idx) => `${String(idx + 1).padStart(padLength, ' ')} | ${line}`)
      .join('\n');
  }

  if (style === 'markdown') {
    return [
      `### File: ${file.name}`,
      `> **Location**: \`${relativeFromRoot}\``,
      `> **Type**: \`${meta.fileType}\` (${meta.language})`,
      `> **Size**: ${formatBytes(file.size)} | **Lines**: ${linesCount}`,
      '',
      `\`\`\`${meta.fileType}`,
      formattedCode,
      '```',
      `<!-- END OF FILE: ${relativeFromRoot} -->`,
      '',
    ].join('\n');
  }

  if (style === 'xml') {
    return [
      `<file path="${relativeFromRoot}" name="${file.name}" type="${meta.fileType}" language="${meta.language}" size="${file.size}" lines="${linesCount}">`,
      formattedCode,
      `</file>`,
      '',
    ].join('\n');
  }

  // Default Standard structure required by user:
  // 1) on top the text should begin with the file's metadata (file location in the project, file name and type)
  // 2) the file's actuall contents (code)
  // 3) Indicate the file's end
  const separator = '='.repeat(80);
  return [
    separator,
    `FILE LOCATION: ${relativeFromRoot}`,
    `FILE NAME: ${file.name}`,
    `FILE TYPE: ${meta.fileType} (${meta.language})`,
    `FILE SIZE: ${formatBytes(file.size)} | LINES: ${linesCount}`,
    separator,
    formattedCode,
    separator,
    `END OF FILE: ${relativeFromRoot}`,
    separator,
    '',
  ].join('\n');
}

/**
 * Combines multiple code files into one single text file, each with the required structure.
 */
export function combineMultipleCodeFiles(
  files: ProcessedFile[],
  options: AnalyzerFormatOptions = {}
): string {
  const { addTableOfContents = true, rootFolderName = '' } = options;
  const sections: string[] = [];

  // Document Overview Header
  const separator = '='.repeat(80);
  sections.push(
    separator,
    `CODEFILE ANALYZER: COMBINED PROJECT CODEBASE ARCHIVE`,
    `ROOT FOLDER: ${rootFolderName || 'Project Root'}`,
    `TOTAL FILES INCLUDED: ${files.length}`,
    `EXPORT TIMESTAMP: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`,
    separator,
    ''
  );

  // Optional Table of Contents / Index
  if (addTableOfContents && files.length > 1) {
    sections.push('TABLE OF CONTENTS:');
    files.forEach((file, idx) => {
      let rel = file.relativePath.replace(/^[\\/]+/, '').replace(/\\/g, '/');
      if (rootFolderName && rel.startsWith(rootFolderName + '/')) {
        rel = rel.slice(rootFolderName.length + 1);
      }
      const meta = identifyCodeFileType(file.name);
      sections.push(
        `  ${idx + 1}. [${meta.fileType.toUpperCase()}] ${rel} (${formatBytes(file.size)})`
      );
    });
    sections.push('', separator, '');
  }

  // Iterate over each file and format
  for (const file of files) {
    sections.push(formatSingleCodeFile(file, options));
  }

  return sections.join('\n');
}
