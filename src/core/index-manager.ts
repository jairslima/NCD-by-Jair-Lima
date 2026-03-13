import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const INDEX_FILE = path.join(os.homedir(), '.ncd_index.json');

interface NcdIndex {
  version: number;
  builtAt: string;
  dirs: string[];
}

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '$RECYCLE.BIN', 'System Volume Information',
  'WinSxS', 'SoftwareDistribution', 'Prefetch', 'Logs',
  '__pycache__', '.svn', 'vendor', 'Temp', 'temp',
]);

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

  const index: NcdIndex = {
    version: 1,
    builtAt: new Date().toISOString(),
    dirs,
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index), 'utf8');
  return dirs.length;
}

function getRoots(): string[] {
  if (process.platform !== 'win32') {
    return [os.homedir(), '/'];
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
  return drives.length > 0 ? drives : ['C:\\'];
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
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.claude') continue;

    const fullPath = path.join(dir, entry.name);
    results.push(fullPath);

    if (onProgress && results.length % 200 === 0) {
      onProgress(fullPath, results.length);
    }

    scanDir(fullPath, results, onProgress);
  }
}
