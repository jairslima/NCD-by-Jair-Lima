import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { searchIndex, indexExists, addDirsToIndex, rankDirectoryMatches, scoreDirectoryMatch } from './index-manager';

const SKIP_DIRS = new Set(['.git', 'node_modules', '$RECYCLE.BIN', 'System Volume Information', 'Windows', 'WinSxS']);
const MAX_RESULTS = 20;
const PRIMARY_MAX_DEPTH = 6;
const EXTENDED_MAX_DEPTH = 10;

export function findDirectories(name: string): string[] {
  if (indexExists()) {
    const results = searchIndex(name);
    if (results.length > 0) return results.slice(0, MAX_RESULTS);
  }

  return searchDisk(name);
}

function searchDisk(name: string): string[] {
  const primary = collectMatches(name, PRIMARY_MAX_DEPTH);
  if (primary.length > 0) return primary;

  return collectMatches(name, EXTENDED_MAX_DEPTH);
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

function getSearchRoots(): string[] {
  const roots = new Set<string>([
    process.cwd(),
    os.homedir(),
    path.dirname(os.homedir()),
    path.parse(process.cwd()).root,
  ]);

  return [...roots];
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
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    visited.push(fullPath);

    if (scoreDirectoryMatch(fullPath, name) > 0) {
      matches.push(fullPath);
    }

    searchIn(fullPath, name, matches, visited, depth + 1, maxDepth);
    if (matches.length >= MAX_RESULTS) return;
  }
}
