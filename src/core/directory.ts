import * as fs from 'fs';
import * as path from 'path';
import { DirNode } from '../types';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.svn', '__pycache__', '$RECYCLE.BIN', 'System Volume Information']);

export function createNode(dirPath: string, level: number = 0): DirNode {
  const name = level === 0 ? dirPath : path.basename(dirPath);
  return {
    name,
    path: dirPath,
    children: null,
    expanded: false,
    level,
    hasKids: null,
  };
}

export function checkHasKids(node: DirNode): boolean {
  if (node.hasKids !== null) return node.hasKids;
  try {
    const entries = fs.readdirSync(node.path, { withFileTypes: true });
    node.hasKids = entries.some(e => e.isDirectory() && !SKIP_DIRS.has(e.name));
  } catch {
    node.hasKids = false;
  }
  return node.hasKids;
}

export function loadChildren(node: DirNode): void {
  if (node.children !== null) return;
  try {
    const entries = fs.readdirSync(node.path, { withFileTypes: true });
    node.children = entries
      .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => createNode(path.join(node.path, e.name), node.level + 1));
    node.hasKids = node.children.length > 0;
  } catch {
    node.children = [];
    node.hasKids = false;
  }
}

export function flattenVisible(root: DirNode): DirNode[] {
  const result: DirNode[] = [];
  function traverse(node: DirNode) {
    result.push(node);
    if (node.expanded && node.children) {
      node.children.forEach(traverse);
    }
  }
  traverse(root);
  return result;
}

export function searchNodes(root: DirNode, query: string): DirNode[] {
  const result: DirNode[] = [];
  const lowerQuery = query.toLowerCase();

  function traverse(node: DirNode) {
    if (node.name.toLowerCase().includes(lowerQuery)) {
      result.push(node);
    }
    if (node.children === null) loadChildren(node);
    if (node.children) node.children.forEach(traverse);
  }

  traverse(root);
  return result;
}
