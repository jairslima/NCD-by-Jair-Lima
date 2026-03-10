import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { searchIndex, indexExists } from './index-manager';

const SKIP_DIRS = new Set(['.git', 'node_modules', '$RECYCLE.BIN', 'System Volume Information', 'Windows', 'WinSxS']);
const MAX_RESULTS = 20;
const MAX_DEPTH = 6;

export function findDirectories(name: string): string[] {
  // Use index when available — fast and complete
  if (indexExists()) {
    const results = searchIndex(name);
    if (results.length > 0) return results;
    // Index built but nothing found — fall through to disk search
  }

  // Fallback: live disk search (limited depth)
  return searchDisk(name);
}

function searchDisk(name: string): string[] {
  const results: string[] = [];
  const lowerName = name.toLowerCase();
  const roots = new Set<string>([
    os.homedir(),
    path.dirname(os.homedir()), // e.g. C:\Users
    path.parse(process.cwd()).root,
  ]);

  for (const root of roots) {
    searchIn(root, lowerName, results, 0);
    if (results.length >= MAX_RESULTS) break;
  }

  return [...new Set(results)].slice(0, MAX_RESULTS);
}

function searchIn(dir: string, name: string, results: string[], depth: number): void {
  if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.name.toLowerCase() === name) results.push(fullPath);
    searchIn(fullPath, name, results, depth + 1);
    if (results.length >= MAX_RESULTS) return;
  }
}
