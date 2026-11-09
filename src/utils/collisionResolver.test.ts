import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCollisions } from './collisionResolver';
import { ProcessedFile } from '../types';

const collidingFiles: ProcessedFile[] = [
  {
    id: '1',
    name: 'notes.txt',
    originalName: 'notes.txt',
    flattenedName: 'notes.txt',
    relativePath: 'personal/notes.txt',
    pathSegments: ['personal', 'notes.txt'],
    directoryPath: 'personal',
    size: 100,
    type: 'text/plain',
    extension: 'txt',
    lastModified: 1000,
  },
  {
    id: '2',
    name: 'notes.txt',
    originalName: 'notes.txt',
    flattenedName: 'notes.txt',
    relativePath: 'work/notes.txt',
    pathSegments: ['work', 'notes.txt'],
    directoryPath: 'work',
    size: 200,
    type: 'text/plain',
    extension: 'txt',
    lastModified: 2000,
  },
  {
    id: '3',
    name: 'unique.pdf',
    originalName: 'unique.pdf',
    flattenedName: 'unique.pdf',
    relativePath: 'docs/unique.pdf',
    pathSegments: ['docs', 'unique.pdf'],
    directoryPath: 'docs',
    size: 500,
    type: 'application/pdf',
    extension: 'pdf',
    lastModified: 3000,
  },
];

test('resolveCollisions with "enumerate" numbers duplicates', () => {
  const { resolvedFiles, collisionCount } = resolveCollisions(collidingFiles, 'enumerate');

  assert.equal(collisionCount, 1);
  assert.equal(resolvedFiles.length, 3);
  assert.equal(resolvedFiles[0].flattenedName, 'notes.txt');
  assert.equal(resolvedFiles[1].flattenedName, 'notes (1).txt');
  assert.equal(resolvedFiles[2].flattenedName, 'unique.pdf');
});

test('resolveCollisions with "prefix-path" prefixes directory path', () => {
  const { resolvedFiles } = resolveCollisions(collidingFiles, 'prefix-path');

  assert.equal(resolvedFiles.length, 3);
  assert.equal(resolvedFiles[0].flattenedName, 'personal_notes.txt');
  assert.equal(resolvedFiles[1].flattenedName, 'work_notes.txt');
  assert.equal(resolvedFiles[2].flattenedName, 'docs_unique.pdf');
});

test('resolveCollisions with "overwrite" preserves unique names only', () => {
  const { resolvedFiles, collisionCount } = resolveCollisions(collidingFiles, 'overwrite');

  assert.equal(collisionCount, 1);
  assert.equal(resolvedFiles.length, 2); // 'notes.txt' and 'unique.pdf'
  const names = resolvedFiles.map(f => f.flattenedName);
  assert.ok(names.includes('notes.txt'));
  assert.ok(names.includes('unique.pdf'));
});
