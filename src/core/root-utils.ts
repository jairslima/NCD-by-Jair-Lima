import * as path from 'path';

function normalizeRoot(root: string): string {
  let normalized = path.resolve(root);
  const parsedRoot = path.parse(normalized).root;

  if (normalized.length > 1 && normalized !== parsedRoot) {
    normalized = normalized.replace(/[\\/]+$/, '');
  }
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isNestedRoot(root: string, candidateParent: string): boolean {
  if (root === candidateParent) return true;

  const separator = candidateParent.endsWith(path.sep) ? '' : path.sep;
  return root.startsWith(candidateParent + separator);
}

export function compactRoots(roots: string[]): string[] {
  const uniqueRoots = Array.from(new Set(roots.map(normalizeRoot)))
    .sort((a, b) => a.length - b.length);

  const compacted: string[] = [];
  for (const root of uniqueRoots) {
    if (compacted.some(existing => isNestedRoot(root, existing))) continue;
    compacted.push(root);
  }

  return compacted;
}
