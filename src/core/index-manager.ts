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

// ── Load / exists ─────────────────────────────────────────────────────────────

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

// ── Add dirs ──────────────────────────────────────────────────────────────────

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

  // Add the directory itself if missing
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

// ── Search ────────────────────────────────────────────────────────────────────

export function searchIndex(name: string): string[] {
  const index = loadIndex();
  if (!index) return [];
  const lower = name.toLowerCase();
  return index.dirs.filter(d => path.basename(d).toLowerCase().startsWith(lower));
}

// ── Build ─────────────────────────────────────────────────────────────────────

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
  // Scan C: through Z:
  for (let c = 67; c <= 90; c++) {
    const drive = String.fromCharCode(c) + ':\\';
    try {
      fs.readdirSync(drive);
      drives.push(drive);
    } catch { /* drive not available */ }
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
    return; // permission denied
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
