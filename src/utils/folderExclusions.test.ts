import test from 'node:test';
import assert from 'node:assert';
import {
  matchExcludedSegment,
  filterFilesByExclusions,
  DEFAULT_EXCLUSION_RULES,
} from './folderExclusions';
import { ProcessedFile } from '../types';

function createMockFile(relativePath: string): ProcessedFile {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  const name = parts[parts.length - 1] || 'file';
  return {
    id: `mock-${relativePath}`,
    name,
    originalName: name,
    flattenedName: name,
    relativePath,
    pathSegments: parts,
    directoryPath: parts.slice(0, -1).join('/'),
    size: 100,
    type: 'text/plain',
    extension: name.split('.').pop() || '',
    lastModified: Date.now(),
  };
}

test('matchExcludedSegment detects node_modules and .git segments', () => {
  const excludedSet = new Set(['node_modules', '.git', 'dist']);

  assert.strictEqual(
    matchExcludedSegment(['project', 'node_modules', 'react', 'index.js'], excludedSet),
    'node_modules'
  );

  assert.strictEqual(
    matchExcludedSegment(['project', '.git', 'objects', 'pack-123'], excludedSet),
    '.git'
  );

  assert.strictEqual(
    matchExcludedSegment(['project', 'src', 'components', 'App.tsx'], excludedSet),
    null
  );
});

test('filterFilesByExclusions filters out node_modules and reports statistics', () => {
  const files: ProcessedFile[] = [
    createMockFile('my-app/package.json'),
    createMockFile('my-app/src/App.tsx'),
    createMockFile('my-app/src/index.css'),
    createMockFile('my-app/node_modules/react/index.js'),
    createMockFile('my-app/node_modules/react/package.json'),
    createMockFile('my-app/node_modules/lodash/lodash.js'),
    createMockFile('my-app/.git/config'),
    createMockFile('my-app/.git/HEAD'),
  ];

  const result = filterFilesByExclusions(files, ['node_modules', '.git']);

  // Should retain only non-excluded files
  assert.strictEqual(result.filteredFiles.length, 3);
  assert.strictEqual(result.totalSkipped, 5);

  // Check detected exclusions
  assert.strictEqual(result.detectedExclusions.length, 2);

  const nodeModulesInfo = result.detectedExclusions.find(e => e.name === 'node_modules');
  assert.ok(nodeModulesInfo);
  assert.strictEqual(nodeModulesInfo?.fileCount, 3);

  const gitInfo = result.detectedExclusions.find(e => e.name === '.git');
  assert.ok(gitInfo);
  assert.strictEqual(gitInfo?.fileCount, 2);
});

test('DEFAULT_EXCLUSION_RULES contains core industry defaults', () => {
  const patterns = DEFAULT_EXCLUSION_RULES.map(r => r.pattern);
  assert.ok(patterns.includes('node_modules'));
  assert.ok(patterns.includes('.git'));
  assert.ok(patterns.includes('dist'));
  assert.ok(patterns.includes('.next'));
  assert.ok(patterns.includes('__pycache__'));
});
