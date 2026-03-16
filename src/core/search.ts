import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { searchIndex, indexExists, addDirsToIndex, rankDirectoryMatches, scoreDirectoryMatch } from './index-manager';
import { shouldSkipDirectoryName } from './directory-rules';
import { compactRoots } from './root-utils';

const MAX_RESULTS = 20;
const PRIMARY_MAX_DEPTH = 6;
const EXTENDED_MAX_DEPTH = 10;
const ASYNC_SEARCH_BATCH_SIZE = 250;

interface SearchFrame {
  dir: string;
  depth: number;
}

export function findDirectories(name: string): string[] {
  if (indexExists()) {
    const results = searchIndex(name);
    if (results.length > 0) return results.slice(0, MAX_RESULTS);
  }

  return searchDisk(name);
}

export async function findDirectoriesAsync(name: string): Promise<string[]> {
  if (indexExists()) {
    const results = searchIndex(name);
    if (results.length > 0) return results.slice(0, MAX_RESULTS);
  }

  return searchDiskAsync(name);
}

function searchDisk(name: string): string[] {
  const primary = collectMatches(name, PRIMARY_MAX_DEPTH);
  if (primary.length > 0) return primary;

  return collectMatches(name, EXTENDED_MAX_DEPTH);
}

async function searchDiskAsync(name: string): Promise<string[]> {
  const primary = await collectMatchesAsync(name, PRIMARY_MAX_DEPTH);
  if (primary.length > 0) return primary;

  return collectMatchesAsync(name, EXTENDED_MAX_DEPTH);
}

function collectMatches(name: string, maxDepth: number): string[] {
  const matches: string[] = [];
  const visited: string[] = [];
  const roots = getSearchRoots();

  for (const root of roots) {
    searchIn(root, name, matches, visited, 0, maxDepth);
    if (matches.length >= MAX_RESULTS) break;
  }

  if (visited.length > 0 && indexExists()) {
    addDirsToIndex(visited);
  }

  return rankDirectoryMatches([...new Set(matches)], name, MAX_RESULTS);
}

async function collectMatchesAsync(name: string, maxDepth: number): Promise<string[]> {
  const matches: string[] = [];
  const visited: string[] = [];
  const roots = getSearchRoots();

  for (const root of roots) {
    await searchInAsync(root, name, matches, visited, maxDepth);
    if (matches.length >= MAX_RESULTS) break;
  }

  if (visited.length > 0 && indexExists()) {
    addDirsToIndex(visited);
  }

  return rankDirectoryMatches([...new Set(matches)], name, MAX_RESULTS);
}

function getSearchRoots(): string[] {
  return compactRoots([
    process.cwd(),
    os.homedir(),
    path.dirname(os.homedir()),
    path.parse(process.cwd()).root,
  ]);
}

function searchIn(
  dir: string,
  name: string,
  matches: string[],
  visited: string[],
  depth: number,
  maxDepth: number
): void {
  if (depth > maxDepth || matches.length >= MAX_RESULTS) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || shouldSkipDirectoryName(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    visited.push(fullPath);

    if (scoreDirectoryMatch(fullPath, name) > 0) {
      matches.push(fullPath);
    }

    searchIn(fullPath, name, matches, visited, depth + 1, maxDepth);
    if (matches.length >= MAX_RESULTS) return;
  }
}

async function searchInAsync(
  rootDir: string,
  name: string,
  matches: string[],
  visited: string[],
  maxDepth: number
): Promise<void> {
  const pending: SearchFrame[] = [{ dir: rootDir, depth: 0 }];
  let processedSinceYield = 0;

  while (pending.length > 0 && matches.length < MAX_RESULTS) {
    const frame = pending.pop();
    if (!frame || frame.depth > maxDepth) continue;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(frame.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry.isDirectory() || shouldSkipDirectoryName(entry.name)) continue;

      const fullPath = path.join(frame.dir, entry.name);
      visited.push(fullPath);

      if (scoreDirectoryMatch(fullPath, name) > 0) {
        matches.push(fullPath);
        if (matches.length >= MAX_RESULTS) break;
      }

      if (frame.depth < maxDepth) {
        pending.push({ dir: fullPath, depth: frame.depth + 1 });
      }

      processedSinceYield++;
      if (processedSinceYield >= ASYNC_SEARCH_BATCH_SIZE) {
        processedSinceYield = 0;
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }
  }
}
