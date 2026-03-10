import * as blessed from 'blessed';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DirNode } from '../types';
import {
  createNode,
  loadChildren,
  checkHasKids,
  flattenVisible,
  searchNodes,
} from '../core/directory';
import { buildIndex } from '../core/index-manager';

function formatLine(node: DirNode, isSelected: boolean): string {
  const indent = '  '.repeat(node.level);
  const hasKids = checkHasKids(node);
  const icon = !hasKids ? '[ ]' : node.expanded ? '[-]' : '[+]';
  const marker = isSelected ? '>' : ' ';
  return `${marker} ${indent}${icon} ${node.name}`;
}

export function runApp(startPath: string): void {
  const root = createNode(startPath, 0);
  root.expanded = true;
  loadChildren(root);

  let flatNodes: DirNode[] = [];
  let selectedIndex = 0;
  let searchQuery = '';
  let searchMode = false;

  const screen = blessed.screen({
    smartCSR: true,
    title: 'NCD - New Change Directory',
    fullUnicode: true,
    output: process.stderr,  // TUI on stderr; stdout reserved for selected path
  });

  const headerBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: '  NCD - New Change Directory  |  by Jair Lima',
    style: { fg: 'black', bg: 'cyan', bold: true },
  });

  const pathBox = blessed.box({
    top: 1,
    left: 0,
    width: '100%',
    height: 1,
    content: '',
    style: { fg: 'white', bg: 'blue' },
  });

  const treeBox = blessed.list({
    top: 2,
    left: 0,
    width: '100%',
    bottom: 3,
    scrollable: true,
    mouse: false,
    keys: false,
    scrollbar: {
      ch: ' ',
      track: { bg: 'blue' },
      style: { inverse: true },
    },
    style: {
      fg: 'white',
      bg: 'black',
      selected: { fg: 'black', bg: 'green', bold: true },
    },
  });

  const searchBox = blessed.box({
    bottom: 2,
    left: 0,
    width: '100%',
    height: 1,
    content: '  Press / to search',
    style: { fg: 'gray', bg: 'black' },
  });

  const helpBox = blessed.box({
    bottom: 1,
    left: 0,
    width: '100%',
    height: 1,
    content: '  ↑↓/jk Navigate   Enter Select/CD   Space Expand   →/← Open/Close   / Search   F5 Rebuild Index   Q/Esc Quit',
    style: { fg: 'black', bg: 'white' },
  });

  const statusBox = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: '',
    style: { fg: 'white', bg: 'black' },
  });

  screen.append(headerBox);
  screen.append(pathBox);
  screen.append(treeBox);
  screen.append(searchBox);
  screen.append(helpBox);
  screen.append(statusBox);

  function setStatus(msg: string) {
    statusBox.setContent('  ' + msg);
  }

  function render() {
    flatNodes = searchMode && searchQuery
      ? searchNodes(root, searchQuery)
      : flattenVisible(root);

    if (selectedIndex >= flatNodes.length) selectedIndex = Math.max(0, flatNodes.length - 1);

    const items = flatNodes.map((node, i) => formatLine(node, i === selectedIndex));
    treeBox.setItems(items as any);
    treeBox.select(selectedIndex);
    treeBox.scrollTo(selectedIndex);

    const current = flatNodes[selectedIndex];
    pathBox.setContent('  Path: ' + (current ? current.path : ''));

    if (searchMode) {
      searchBox.setContent(`  Search: ${searchQuery}_`);
      searchBox.style.fg = 'yellow';
    } else {
      searchBox.setContent('  Press / to search');
      searchBox.style.fg = 'gray';
    }

    setStatus(flatNodes.length > 0
      ? `${selectedIndex + 1}/${flatNodes.length} dirs${searchMode ? `  [SEARCH: "${searchQuery}"]` : ''}`
      : 'No directories found'
    );

    screen.render();
  }

  function toggleExpand() {
    const node = flatNodes[selectedIndex];
    if (!node) return;

    if (node.expanded) {
      node.expanded = false;
    } else {
      loadChildren(node);
      node.expanded = true;
    }
    render();
  }

  function exitWithPath(dirPath: string) {
    screen.destroy();
    const lastFile = path.join(os.homedir(), '.ncd_last');
    fs.writeFileSync(lastFile, dirPath, 'utf8');
    process.stderr.write('\nNCD by Jair Lima\n');
    process.exit(0);
  }

  function moveSelection(delta: number) {
    const next = selectedIndex + delta;
    if (next < 0 || next >= flatNodes.length) return;
    selectedIndex = next;
    const items = flatNodes.map((node, i) => formatLine(node, i === selectedIndex));
    treeBox.setItems(items as any);
    treeBox.select(selectedIndex);
    treeBox.scrollTo(selectedIndex);
    const current = flatNodes[selectedIndex];
    pathBox.setContent('  Path: ' + (current ? current.path : ''));
    setStatus(`${selectedIndex + 1}/${flatNodes.length} dirs${searchMode ? `  [SEARCH: "${searchQuery}"]` : ''}`);
    screen.render();
  }

  screen.key(['up', 'k'], () => moveSelection(-1));
  screen.key(['down', 'j'], () => moveSelection(1));
  screen.key(['pageup'], () => moveSelection(-10));
  screen.key(['pagedown'], () => moveSelection(10));

  screen.key(['enter'], () => {
    const node = flatNodes[selectedIndex];
    if (node) exitWithPath(node.path);
  });

  screen.key(['space'], toggleExpand);

  screen.key(['right', 'l'], () => {
    const node = flatNodes[selectedIndex];
    if (node && !node.expanded && checkHasKids(node)) {
      loadChildren(node);
      node.expanded = true;
      render();
    }
  });

  screen.key(['left', 'h'], () => {
    const node = flatNodes[selectedIndex];
    if (!node) return;
    if (node.expanded) {
      node.expanded = false;
      render();
    } else if (node.level > 0) {
      const parentPath = path.dirname(node.path);
      const parentIdx = flatNodes.findIndex(n => n.path === parentPath);
      if (parentIdx !== -1) {
        flatNodes[parentIdx].expanded = false;
        selectedIndex = parentIdx;
        render();
      }
    }
  });

  screen.key(['/'], () => {
    searchMode = true;
    searchQuery = '';
    render();
  });

  screen.key(['escape'], () => {
    if (searchMode) {
      searchMode = false;
      searchQuery = '';
      selectedIndex = 0;
      render();
    } else {
      screen.destroy();
      process.exit(0);
    }
  });

  screen.key(['backspace'], () => {
    if (searchMode && searchQuery.length > 0) {
      searchQuery = searchQuery.slice(0, -1);
      selectedIndex = 0;
      render();
    }
  });

  screen.on('keypress', (ch: string, key: any) => {
    if (searchMode && ch && ch.length === 1 && key && !key.ctrl && !key.meta) {
      searchQuery += ch;
      selectedIndex = 0;
      render();
    }
  });

  screen.key(['q', 'Q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  screen.key(['f5'], () => {
    setStatus('  Rebuilding index... please wait');
    screen.render();

    let lastCount = 0;
    const count = buildIndex((_, n) => {
      lastCount = n;
      setStatus(`  Rebuilding index... ${n} dirs found`);
      screen.render();
    });

    setStatus(`  Index rebuilt: ${count} directories found`);
    render();
  });

  render();
  treeBox.focus();
}

// Picker TUI shown when multiple directories share the same name
export function runPicker(matches: string[]): void {
  const { goToPath } = require('../core/navigation') as typeof import('../core/navigation');

  const name = path.basename(matches[0]);

  const screen = blessed.screen({
    smartCSR: true,
    title: 'NCD - Ambiguous Directory',
    fullUnicode: true,
    output: process.stderr,
  });

  const header = blessed.box({
    top: 0, left: 0, width: '100%', height: 1,
    content: `  NCD - Ambiguous: ${matches.length} directories named "${name}"`,
    style: { fg: 'black', bg: 'cyan', bold: true },
  });

  // Build display lines: "  [name]  →  parent/path"
  const items = matches.map(m => {
    const parent = path.dirname(m);
    return `  ${path.basename(m)}  →  ${parent}`;
  });

  const list = blessed.list({
    top: 1, left: 0, width: '100%', bottom: 3,
    scrollable: true, keys: false, mouse: false,
    items,
    style: {
      fg: 'white', bg: 'black',
      selected: { fg: 'black', bg: 'green', bold: true },
    },
  });

  const pathBar = blessed.box({
    bottom: 2, left: 0, width: '100%', height: 1,
    content: `  Path: ${matches[0]}`,
    style: { fg: 'white', bg: 'blue' },
  });

  const help = blessed.box({
    bottom: 1, left: 0, width: '100%', height: 1,
    content: '  ↑↓/jk Navigate   Enter Select   Esc/Q Cancel',
    style: { fg: 'black', bg: 'white' },
  });

  const status = blessed.box({
    bottom: 0, left: 0, width: '100%', height: 1,
    content: `  1/${matches.length}`,
    style: { fg: 'white', bg: 'black' },
  });

  screen.append(header);
  screen.append(list);
  screen.append(pathBar);
  screen.append(help);
  screen.append(status);

  let idx = 0;

  function updateSelection(newIdx: number) {
    idx = newIdx;
    list.select(idx);
    pathBar.setContent(`  Path: ${matches[idx]}`);
    status.setContent(`  ${idx + 1}/${matches.length}`);
    screen.render();
  }

  screen.key(['up', 'k'], () => { if (idx > 0) updateSelection(idx - 1); });
  screen.key(['down', 'j'], () => { if (idx < matches.length - 1) updateSelection(idx + 1); });

  screen.key(['enter'], () => {
    screen.destroy();
    goToPath(matches[idx]);
  });

  screen.key(['escape', 'q', 'Q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  updateSelection(0);
  list.focus();
}
