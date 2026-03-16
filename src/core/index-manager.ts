import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { shouldSkipDirectoryName } from './directory-rules';
import { compactRoots } from './root-utils';

export const INDEX_FILE = path.join(os.homedir(), '.ncd_index.json');

interface NcdIndex {
  version: number;
  builtAt: string;
  dirs: string[];
}

interface ScanFrame {
  dir: string;
  depth: number;
}

const ASYNC_SCAN_BATCH_SIZE = 250;

export function indexExists(): boolean {
  return fs.existsSync(INDEX_FILE);
}

export function loadIndex(): NcdIndex | null {
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function isDirInIndex(dirPath: string): boolean {
  const index = loadIndex();
  if (!index) return false;
  const norm = path.normalize(dirPath).toLowerCase();
  return index.dirs.some(d => path.normalize(d).toLowerCase() === norm);
}

export function addDirsToIndex(newDirs: string[]): void {
  const index = loadIndex();
  if (!index) return;
  const existing = new Set(index.dirs.map(d => path.normalize(d).toLowerCase()));
  let added = false;
  for (const d of newDirs) {
    const norm = path.normalize(d).toLowerCase();
    if (!existing.has(norm)) {
      index.dirs.push(d);
      existing.add(norm);
      added = true;
    }
  }
  if (added) fs.writeFileSync(INDEX_FILE, JSON.stringify(index), 'utf8');
}

export function scanAndAddToIndex(dir: string): number {
  const index = loadIndex();
  if (!index) return 0;
  const existing = new Set(index.dirs.map(d => path.normalize(d).toLowerCase()));
  const newDirs: string[] = [];

  const dirNorm = path.normalize(dir).toLowerCase();
  if (!existing.has(dirNorm)) newDirs.push(dir);

  scanDir(dir, newDirs);

  let added = 0;
  for (const d of newDirs) {
    const norm = path.normalize(d).toLowerCase();
    if (!existing.has(norm)) {
      index.dirs.push(d);
      existing.add(norm);
      added++;
    }
  }
  if (added > 0) fs.writeFileSync(INDEX_FILE, JSON.stringify(index), 'utf8');
  return added;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

export function scoreDirectoryMatch(dirPath: string, query: string): number {
  const baseName = path.basename(dirPath);
  const normalizedBase = normalizeSearchText(baseName);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedBase || !normalizedQuery) return 0;
  if (normalizedBase === normalizedQuery) return 1000;
  if (normalizedBase.startsWith(normalizedQuery)) return 800;

  const baseTokens = tokenizeSearchText(baseName);
  const queryTokens = tokenizeSearchText(query);

  if (queryTokens.length > 0 && queryTokens.every(token => baseTokens.some(base => base.startsWith(token)))) {
    return 700;
  }

  if (normalizedBase.includes(normalizedQuery)) return 500;

  if (queryTokens.length > 0 && queryTokens.every(token => normalizedBase.includes(token))) {
    return 400;
  }

  return 0;
}

export function rankDirectoryMatches(dirPaths: string[], query: string, maxResults?: number): string[] {
  const ranked = dirPaths
    .map(dirPath => ({ dirPath, score: scoreDirectoryMatch(dirPath, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const baseDiff = path.basename(a.dirPath).length - path.basename(b.dirPath).length;
      if (baseDiff !== 0) return baseDiff;

      return a.dirPath.localeCompare(b.dirPath);
    })
    .map(item => item.dirPath);

  return typeof maxResults === 'number' ? ranked.slice(0, maxResults) : ranked;
}

export function searchIndex(name: string): string[] {
  const index = loadIndex();
  if (!index) return [];
  return rankDirectoryMatches(index.dirs, name);
}

export function buildIndex(
  onProgress?: (current: string, count: number) => void
): number {
  const dirs: string[] = [];
  const roots = getRoots();

  for (const root of roots) {
    scanDir(root, dirs, onProgress);
  }

  writeIndex(dirs);
  return dirs.length;
}

export async function buildIndexAsync(
  onProgress?: (current: string, count: number) => void
): Promise<number> {
  const dirs: string[] = [];
  const roots = getRoots();

  for (const root of roots) {
    await scanDirAsync(root, dirs, onProgress);
  }

  writeIndex(dirs);
  return dirs.length;
}

function writeIndex(dirs: string[]): void {
  const index: NcdIndex = {
    version: 1,
    builtAt: new Date().toISOString(),
    dirs,
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index), 'utf8');
}

function getRoots(): string[] {
  if (process.platform !== 'win32') {
    return compactRoots([os.homedir(), '/']);
  }

  const drives: string[] = [];
  for (let c = 67; c <= 90; c++) {
    const drive = String.fromCharCode(c) + ':\\';
    try {
      fs.readdirSync(drive);
      drives.push(drive);
    } catch {
      // Drive not available.
    }
  }
  return compactRoots(drives.length > 0 ? drives : ['C:\\']);
}

function scanDir(
  dir: string,
  results: string[],
  onProgress?: (current: string, count: number) => void
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (shouldSkipDirectoryName(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    results.push(fullPath);

    if (onProgress && results.length % 200 === 0) {
      onProgress(fullPath, results.length);
    }

    scanDir(fullPath, results, onProgress);
  }
}

async function scanDirAsync(
  rootDir: string,
  results: string[],
  onProgress?: (current: string, count: number) => void
): Promise<void> {
  const pending: ScanFrame[] = [{ dir: rootDir, depth: 0 }];
  let processedSinceYield = 0;

  while (pending.length > 0) {
    const frame = pending.pop();
    if (!frame) continue;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(frame.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry.isDirectory()) continue;
      if (shouldSkipDirectoryName(entry.name)) continue;

      const fullPath = path.join(frame.dir, entry.name);
      results.push(fullPath);
      pending.push({ dir: fullPath, depth: frame.depth + 1 });

      if (onProgress && results.length % 200 === 0) {
        onProgress(fullPath, results.length);
      }

      processedSinceYield++;
      if (processedSinceYield >= ASYNC_SCAN_BATCH_SIZE) {
        processedSinceYield = 0;
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }
  }
}
