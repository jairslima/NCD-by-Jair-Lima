import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SKIP_DIRS = new Set(['.git', 'node_modules', '$RECYCLE.BIN', 'System Volume Information', 'Windows', 'WinSxS']);
const MAX_RESULTS = 20;
const MAX_DEPTH = 6;

export function findDirectories(name: string): string[] {
  const results: string[] = [];
  const lowerName = name.toLowerCase();

  // Search roots: home dir + current drive root
  const roots = new Set<string>();
  roots.add(os.homedir());

  // Add drive root (e.g. C:\)
  const cwd = process.cwd();
  const driveRoot = path.parse(cwd).root; // e.g. "C:\"
  roots.add(driveRoot);

  // Also add parent of home dir (e.g. C:\Users)
  roots.add(path.dirname(os.homedir()));

  for (const root of roots) {
    searchIn(root, lowerName, results, 0);
    if (results.length >= MAX_RESULTS) break;
  }

  // Deduplicate
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
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.name.toLowerCase() === name) {
      results.push(fullPath);
    }

    searchIn(fullPath, name, results, depth + 1);
    if (results.length >= MAX_RESULTS) return;
  }
}
