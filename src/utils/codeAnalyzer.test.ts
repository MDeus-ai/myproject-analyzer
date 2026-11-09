import test from 'node:test';
import assert from 'node:assert/strict';
import {
  identifyCodeFileType,
  formatSingleCodeFile,
  combineMultipleCodeFiles,
  countLines,
  estimateTokens,
} from './codeAnalyzer';
import { ProcessedFile } from '../types';

test('identifyCodeFileType correctly identifies various code formats', () => {
  const tsx = identifyCodeFileType('Button.tsx');
  assert.equal(tsx.isCode, true);
  assert.equal(tsx.fileType, 'tsx');
  assert.equal(tsx.language, 'TypeScript React');

  const html = identifyCodeFileType('index.html');
  assert.equal(html.isCode, true);
  assert.equal(html.fileType, 'html');

  const ts = identifyCodeFileType('server.ts');
  assert.equal(ts.isCode, true);
  assert.equal(ts.fileType, 'ts');

  const jsx = identifyCodeFileType('App.jsx');
  assert.equal(jsx.isCode, true);
  assert.equal(jsx.fileType, 'jsx');

  const js = identifyCodeFileType('script.js');
  assert.equal(js.isCode, true);
  assert.equal(js.fileType, 'js');

  const env = identifyCodeFileType('.env.example');
  assert.equal(env.isCode, true);

  const docker = identifyCodeFileType('Dockerfile');
  assert.equal(docker.isCode, true);
  assert.equal(docker.fileType, 'dockerfile');

  const binary = identifyCodeFileType('image.png');
  assert.equal(binary.isCode, false);
});

test('formatSingleCodeFile formats with 1) metadata on top, 2) actual content, 3) end indicator', () => {
  const sampleFile: ProcessedFile = {
    id: 'f1',
    name: 'Header.tsx',
    originalName: 'Header.tsx',
    flattenedName: 'Header.tsx',
    relativePath: 'my-project/src/components/Header.tsx',
    pathSegments: ['my-project', 'src', 'components', 'Header.tsx'],
    directoryPath: 'src/components',
    size: 50,
    type: 'text/typescript',
    extension: 'tsx',
    lastModified: 1700000000000,
    textContent: 'export function Header() { return <header>Logo</header>; }',
  };

  const formatted = formatSingleCodeFile(sampleFile, { rootFolderName: 'my-project' });

  // 1) Metadata on top:
  assert.ok(formatted.includes('FILE LOCATION: src/components/Header.tsx'));
  assert.ok(formatted.includes('FILE NAME: Header.tsx'));
  assert.ok(formatted.includes('FILE TYPE: tsx (TypeScript React)'));

  // 2) Actual code:
  assert.ok(formatted.includes('export function Header() { return <header>Logo</header>; }'));

  // 3) End indicator:
  assert.ok(formatted.includes('END OF FILE: src/components/Header.tsx'));

  // Verify ordering: metadata appears before code, which appears before end
  const metaPos = formatted.indexOf('FILE LOCATION:');
  const codePos = formatted.indexOf('export function Header');
  const endPos = formatted.indexOf('END OF FILE:');

  assert.ok(metaPos < codePos);
  assert.ok(codePos < endPos);
});

test('combineMultipleCodeFiles combines multiple files into one single text file', () => {
  const files: ProcessedFile[] = [
    {
      id: 'f1',
      name: 'index.html',
      originalName: 'index.html',
      flattenedName: 'index.html',
      relativePath: 'app/public/index.html',
      pathSegments: ['app', 'public', 'index.html'],
      directoryPath: 'public',
      size: 40,
      type: 'text/html',
      extension: 'html',
      lastModified: 1700000000000,
      textContent: '<!DOCTYPE html><html><body>App</body></html>',
    },
    {
      id: 'f2',
      name: 'app.js',
      originalName: 'app.js',
      flattenedName: 'app.js',
      relativePath: 'app/src/app.js',
      pathSegments: ['app', 'src', 'app.js'],
      directoryPath: 'src',
      size: 30,
      type: 'application/javascript',
      extension: 'js',
      lastModified: 1700000001000,
      textContent: 'console.log("running");',
    },
  ];

  const combined = combineMultipleCodeFiles(files, { rootFolderName: 'app' });

  // Header contains summary
  assert.ok(combined.includes('TOTAL FILES INCLUDED: 2'));
  assert.ok(combined.includes('TABLE OF CONTENTS:'));

  // First file structure
  assert.ok(combined.includes('FILE LOCATION: public/index.html'));
  assert.ok(combined.includes('<!DOCTYPE html><html><body>App</body></html>'));
  assert.ok(combined.includes('END OF FILE: public/index.html'));

  // Second file structure
  assert.ok(combined.includes('FILE LOCATION: src/app.js'));
  assert.ok(combined.includes('console.log("running");'));
  assert.ok(combined.includes('END OF FILE: src/app.js'));
});

test('countLines and estimateTokens calculate metrics correctly', () => {
  const code = 'line 1\nline 2\nline 3';
  assert.equal(countLines(code), 3);
  assert.ok(estimateTokens(code) > 0);
});
