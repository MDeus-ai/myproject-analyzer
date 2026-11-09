import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFolderTree, generateTreeText, flattenDirectoryInventory } from './treeBuilder';
import { ProcessedFile } from '../types';

const sampleFiles: ProcessedFile[] = [
  {
    id: '1',
    name: 'README.md',
    originalName: 'README.md',
    flattenedName: 'README.md',
    relativePath: 'my-project/README.md',
    pathSegments: ['my-project', 'README.md'],
    directoryPath: '',
    size: 1024,
    type: 'text/markdown',
    extension: 'md',
    lastModified: 1700000000000,
  },
  {
    id: '2',
    name: 'index.ts',
    originalName: 'index.ts',
    flattenedName: 'index.ts',
    relativePath: 'my-project/src/index.ts',
    pathSegments: ['my-project', 'src', 'index.ts'],
    directoryPath: 'src',
    size: 2048,
    type: 'text/typescript',
    extension: 'ts',
    lastModified: 1700000001000,
  },
  {
    id: '3',
    name: 'button.tsx',
    originalName: 'button.tsx',
    flattenedName: 'button.tsx',
    relativePath: 'my-project/src/components/button.tsx',
    pathSegments: ['my-project', 'src', 'components', 'button.tsx'],
    directoryPath: 'src/components',
    size: 4096,
    type: 'text/typescript',
    extension: 'tsx',
    lastModified: 1700000002000,
  },
  {
    id: '4',
    name: 'logo.png',
    originalName: 'logo.png',
    flattenedName: 'logo.png',
    relativePath: 'my-project/assets/images/logo.png',
    pathSegments: ['my-project', 'assets', 'images', 'logo.png'],
    directoryPath: 'assets/images',
    size: 8192,
    type: 'image/png',
    extension: 'png',
    lastModified: 1700000003000,
  },
];

test('buildFolderTree creates proper hierarchy and totals', () => {
  const { root, stats } = buildFolderTree(sampleFiles, 'my-project');

  assert.equal(root.name, 'my-project');
  assert.equal(stats.totalFiles, 4);
  assert.equal(stats.totalSize, 1024 + 2048 + 4096 + 8192);
  assert.equal(stats.maxDepth, 2); // 'src/components' or 'assets/images' are 2 deep from root
  assert.equal(stats.extensionCounts['md'].count, 1);
  assert.equal(stats.extensionCounts['ts'].count, 1);
  assert.equal(stats.extensionCounts['tsx'].count, 1);
  assert.equal(stats.extensionCounts['png'].count, 1);

  // Check subfolders
  assert.ok(root.subfolders.has('src'));
  assert.ok(root.subfolders.has('assets'));
  const srcNode = root.subfolders.get('src')!;
  assert.equal(srcNode.files.length, 1);
  assert.ok(srcNode.subfolders.has('components'));
});

test('generateTreeText outputs valid branch indicators', () => {
  const { root } = buildFolderTree(sampleFiles, 'my-project');
  const treeText = generateTreeText(root, { includeSizes: true });

  assert.ok(treeText.includes('my-project/'));
  assert.ok(treeText.includes('src/'));
  assert.ok(treeText.includes('button.tsx'));
  assert.ok(treeText.includes('logo.png'));
  assert.ok(treeText.includes('README.md'));
  assert.ok(treeText.includes('├──') || treeText.includes('└──'));
});

test('generateTreeText with style ascii outputs safe ASCII connectors for PDF compatibility', () => {
  const { root } = buildFolderTree(sampleFiles, 'my-project');
  const asciiTree = generateTreeText(root, { includeSizes: true, style: 'ascii' });

  assert.ok(asciiTree.includes('|-- ') || asciiTree.includes('\\-- '));
  assert.ok(!asciiTree.includes('├──'));
  assert.ok(!asciiTree.includes('└──'));
});

test('flattenDirectoryInventory creates ordered list with full metadata', () => {
  const { root } = buildFolderTree(sampleFiles, 'my-project');
  const inventory = flattenDirectoryInventory(root);

  assert.equal(inventory.length, 4);
  assert.equal(inventory[0].index, 1);
  const filenames = inventory.map(item => item.filename);
  assert.ok(filenames.includes('README.md'));
  assert.ok(filenames.includes('button.tsx'));
});
