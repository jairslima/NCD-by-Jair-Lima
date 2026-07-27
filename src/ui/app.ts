import * as blessed from 'blessed';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DirNode, KeypressInfo } from '../types';
import { createNode, loadChildren, checkHasKids, flattenVisible, searchNodes } from '../core/directory';
import { buildIndexAsync } from '../core/index-manager';
import { loadBookmarks, toggleBookmark } from '../core/bookmarks';
import { loadHistory } from '../core/history';
import { goToPath } from '../core/navigation';
import { getLastSelection, saveLastSelection } from '../core/last-selection';

// ── Color scheme ──────────────────────────────────────────────────────────────
const SYSTEM_DIR_NAMES = new Set([
  'windows', 'program files', 'program files (x86)', 'programdata',
  'recovery', '$recycle.bin', 'system volume information', 'perflogs', 'boot',
]);

function getDirColor(dirPath: string, bookmarkedSet: Set<string>, cwdPath: string): [string, string] {
  const lower = dirPath.toLowerCase();
  const name  = path.basename(lower);

  if (bookmarkedSet.has(lower))                              return ['{yellow-fg}', '{/yellow-fg}'];
  if (lower === cwdPath.toLowerCase())                       return ['{cyan-fg}',   '{/cyan-fg}'];
  if (path.dirname(lower) === os.homedir().toLowerCase())    return ['{green-fg}',  '{/green-fg}'];
  if (SYSTEM_DIR_NAMES.has(name))                            return ['{blue-fg}',   '{/blue-fg}'];
  if (name.startsWith('.'))                                  return ['{blue-fg}',   '{/blue-fg}'];
  return ['', ''];
}

function formatLine(node: DirNode, isSelected: boolean, bookmarkedSet: Set<string>, cwdPath: string): string {
  const indent    = '  '.repeat(node.level);
  const hasKids   = checkHasKids(node);
  const icon      = !hasKids ? '[ ]' : node.expanded ? '[-]' : '[+]';
  const marker    = isSelected ? '>' : ' ';
  const star      = bookmarkedSet.has(node.path.toLowerCase()) ? '\u2605 ' : '';
  const [open, close] = getDirColor(node.path, bookmarkedSet, cwdPath);
  return `${open}${marker} ${indent}${icon} ${star}${node.name}${close}`;
}

function setSearchPrompt(
  searchBox: blessed.Widgets.BoxElement,
  searchMode: boolean,
  searchQuery: string
): void {
  if (searchMode) {
    searchBox.setContent(`  Search: ${searchQuery}_`);
    searchBox.style.fg = 'yellow';
    return;
  }

  searchBox.setContent('  Press / to search');
  searchBox.style.fg = 'grey';
}

// ── Drive detection ───────────────────────────────────────────────────────────
function getAvailableDrives(): string[] {
  if (process.platform !== 'win32') return ['/'];
  const drives: string[] = [];
  for (let c = 67; c <= 90; c++) {
    const drive = String.fromCharCode(c) + ':\\';
    try { fs.readdirSync(drive); drives.push(drive); } catch { /* not available */ }
  }
  return drives.length > 0 ? drives : ['C:\\'];
}

// ── Main TUI ──────────────────────────────────────────────────────────────────
export function runApp(startPath: string, highlightPath?: string): void {
  const cwdPath = highlightPath || startPath;
  const drives  = getAvailableDrives();
  let driveIdx  = drives.findIndex(d => startPath.toLowerCase().startsWith(d.toLowerCase()));
  if (driveIdx < 0) driveIdx = 0;

  let root = createNode(startPath, 0);
  root.expanded = true;
  loadChildren(root);

  // Pre-expand tree to highlightPath
  if (highlightPath && highlightPath.toLowerCase().startsWith(startPath.toLowerCase())) {
    const segments = highlightPath.slice(startPath.length).split(path.sep).filter(Boolean);
    let cur = root;
    for (const seg of segments) {
      if (!cur.children) loadChildren(cur);
      const child = cur.children?.find(c => path.basename(c.path).toLowerCase() === seg.toLowerCase());
      if (!child) break;
      loadChildren(child);
      child.expanded = true;
      cur = child;
    }
  }

  let flatNodes: DirNode[]  = [];
  let selectedIndex         = 0;
  let searchQuery           = '';
  let searchMode            = false;
  let rebuildInProgress     = false;
  let bookmarkedSet         = new Set(loadBookmarks().map(b => b.toLowerCase()));

  const screen = blessed.screen({ smartCSR: true, title: 'NCD', fullUnicode: true, output: process.stderr });

  const headerBox = blessed.box({ top: 0, left: 0, width: '100%', height: 1, content: '', style: { fg: 'black', bg: 'cyan', bold: true } });
  const pathBox   = blessed.box({ top: 1, left: 0, width: '100%', height: 1, content: '', style: { fg: 'white', bg: 'blue' } });

  const treeBox = blessed.list({
    top: 2, left: 0, width: '100%', bottom: 4,
    scrollable: true, keys: false, mouse: false, tags: true,
    scrollbar: { ch: ' ', track: { bg: 'blue' }, style: { inverse: true } },
    style: { fg: 'white', bg: 'black', selected: { fg: 'black', bg: 'green', bold: true } },
  });

  const searchBox = blessed.box({ bottom: 3, left: 0, width: '100%', height: 1, content: '  Press / to search', style: { fg: 'grey', bg: 'black' } });
  const help1Box  = blessed.box({ bottom: 2, left: 0, width: '100%', height: 1, content: '  \u2191\u2193/jk Nav   Enter CD   Space Expand   \u2192/\u2190 Open/Close   / Search   Esc/Q Quit', style: { fg: 'black', bg: 'white' } });
  const help2Box  = blessed.box({ bottom: 1, left: 0, width: '100%', height: 1, content: '  B Bookmark   F Favorites   H History   Tab Drive   F5 Rebuild Index', style: { fg: 'black', bg: 'white' } });
  const statusBox = blessed.box({ bottom: 0, left: 0, width: '100%', height: 1, content: '', style: { fg: 'white', bg: 'black' } });

  screen.append(headerBox);
  screen.append(pathBox);
  screen.append(treeBox);
  screen.append(searchBox);
  screen.append(help1Box);
  screen.append(help2Box);
  screen.append(statusBox);

  function setStatus(msg: string) { statusBox.setContent('  ' + msg); }

  function updateHeader() {
    const driveLabels = drives.map((d, i) => {
      const label = d.replace(':\\', ':');
      return i === driveIdx ? `[${label}]` : label;
    }).join('  ');
    headerBox.setContent(`  NCD - New Change Directory  |  ${driveLabels}`);
  }

  function updatePathBar(): void {
    const cur = flatNodes[selectedIndex];
    pathBox.setContent('  Path: ' + (cur ? cur.path : ''));
  }

  function renderList(): void {
    const items = flatNodes.map((node, index) => formatLine(node, index === selectedIndex, bookmarkedSet, cwdPath));
    treeBox.setItems(items);
    treeBox.select(selectedIndex);
    treeBox.scrollTo(selectedIndex);
  }

  function render() {
    flatNodes = searchMode && searchQuery ? searchNodes(root, searchQuery) : flattenVisible(root);
    if (selectedIndex >= flatNodes.length) selectedIndex = Math.max(0, flatNodes.length - 1);

    renderList();
    updatePathBar();
    setSearchPrompt(searchBox, searchMode, searchQuery);

    setStatus(`${selectedIndex + 1}/${flatNodes.length} dirs` +
      (bookmarkedSet.size > 0 ? `   \u2605 ${bookmarkedSet.size} bookmarks` : '') +
      (searchMode ? `   [SEARCH: "${searchQuery}"]` : ''));

    updateHeader();
    screen.render();
  }

  function moveSelection(delta: number) {
    const next = Math.max(0, Math.min(flatNodes.length - 1, selectedIndex + delta));
    if (next === selectedIndex) return;
    selectedIndex = next;
    renderList();
    updatePathBar();
    setStatus(`${selectedIndex + 1}/${flatNodes.length} dirs` + (bookmarkedSet.size > 0 ? `   \u2605 ${bookmarkedSet.size} bookmarks` : ''));
    screen.render();
  }

  function toggleExpand() {
    const node = flatNodes[selectedIndex];
    if (!node) return;
    if (node.expanded) { node.expanded = false; }
    else { loadChildren(node); node.expanded = true; }
    render();
  }

  function switchToDrive(idx: number) {
    driveIdx = idx;
    root = createNode(drives[driveIdx], 0);
    root.expanded = true;
    loadChildren(root);
    selectedIndex = 0;
    render();
  }

  // ── Key bindings ─────────────────────────────────────────────────────────
  screen.key(['up',   'k'],        () => moveSelection(-1));
  screen.key(['down', 'j'],        () => moveSelection(1));
  screen.key(['pageup'],           () => moveSelection(-10));
  screen.key(['pagedown'],         () => moveSelection(10));

  screen.key(['enter'], () => {
    const node = flatNodes[selectedIndex];
    if (node) { screen.destroy(); goToPath(node.path); }
  });

  screen.key(['space'], toggleExpand);

  screen.key(['right', 'l'], () => {
    const node = flatNodes[selectedIndex];
    if (node && !node.expanded && checkHasKids(node)) { loadChildren(node); node.expanded = true; render(); }
  });

  screen.key(['left', 'h'], () => {
    const node = flatNodes[selectedIndex];
    if (!node) return;
    if (node.expanded) { node.expanded = false; render(); }
    else if (node.level > 0) {
      const parentIdx = flatNodes.findIndex(n => n.path === path.dirname(node.path));
      if (parentIdx !== -1) { flatNodes[parentIdx].expanded = false; selectedIndex = parentIdx; render(); }
    }
  });

  screen.key(['/'], () => { searchMode = true; searchQuery = ''; render(); });

  screen.key(['escape'], () => {
    if (searchMode) { searchMode = false; searchQuery = ''; selectedIndex = 0; render(); }
    else { screen.destroy(); process.exit(0); }
  });

  screen.key(['backspace'], () => {
    if (searchMode && searchQuery.length > 0) { searchQuery = searchQuery.slice(0, -1); selectedIndex = 0; render(); }
  });

  screen.on('keypress', (ch: string, key: KeypressInfo) => {
    if (searchMode && ch && ch.length === 1 && key && !key.ctrl && !key.meta) { searchQuery += ch; selectedIndex = 0; render(); }
  });

  // Bookmark toggle (B)
  screen.key(['b', 'B'], () => {
    const node = flatNodes[selectedIndex];
    if (!node) return;
    const added = toggleBookmark(node.path);
    bookmarkedSet = new Set(loadBookmarks().map(b => b.toLowerCase()));
    setStatus(added ? `  \u2605 Bookmarked: ${node.path}` : `  Removed bookmark: ${node.path}`);
    render();
  });

  // Favorites list (F)
  screen.key(['f', 'F'], () => {
    const bm = loadBookmarks();
    if (bm.length === 0) { setStatus('  No bookmarks yet. Press B to add.'); screen.render(); return; }
    screen.destroy();
    runPicker(bm, 'Favorites \u2605');
  });

  // History (H)
  screen.key(['h', 'H'], () => {
    const hist = loadHistory();
    if (hist.length === 0) { setStatus('  No history yet.'); screen.render(); return; }
    screen.destroy();
    runPicker(hist, 'History');
  });

  // Drive switching (Tab)
  screen.key(['tab'], () => {
    if (drives.length <= 1) { setStatus('  No other drives available.'); screen.render(); return; }
    switchToDrive((driveIdx + 1) % drives.length);
  });

  // Rebuild index (F5)
  screen.key(['f5'], async () => {
    if (rebuildInProgress) {
      setStatus('  Rebuild already in progress...');
      screen.render();
      return;
    }

    rebuildInProgress = true;
    setStatus('  Rebuilding index...');
    screen.render();
    try {
      const count = await buildIndexAsync((_, n) => {
        setStatus(`  Rebuilding index... ${n} dirs`);
        screen.render();
      });
      setStatus(`  Index rebuilt: ${count} directories`);
      render();
    } catch {
      setStatus('  Failed to rebuild index');
      screen.render();
    } finally {
      rebuildInProgress = false;
    }
  });

  screen.key(['q', 'Q', 'C-c'], () => { screen.destroy(); process.exit(0); });

  // Position cursor on highlightPath
  if (highlightPath) {
    flatNodes = flattenVisible(root);
    const idx = flatNodes.findIndex(n => n.path.toLowerCase() === highlightPath.toLowerCase());
    if (idx !== -1) selectedIndex = idx;
  }

  render();
  treeBox.focus();
}

// ── Picker color classification ───────────────────────────────────────────────
function getPickerLineColor(fullPath: string): [string, string] {
  const home  = os.homedir().toLowerCase();
  const lower = fullPath.toLowerCase();
  const name  = path.basename(lower);

  // Dot/hidden folders → blue (dim)
  if (name.startsWith('.')) return ['{blue-fg}', '{/blue-fg}'];

  // AppData → yellow (semi-system)
  const appData = path.join(home, 'appdata');
  if (lower.startsWith(appData) || lower.includes('\\appdata\\') || lower.includes('/appdata/')) {
    return ['{yellow-fg}', '{/yellow-fg}'];
  }

  // Under user home → white (default, no tag)
  if (lower.startsWith(home)) return ['', ''];

  // System / unknown → light grey (plain 'grey' maps to ANSI bright-black,
  // which renders nearly black on dark terminal themes)
  return ['{lightgrey-fg}', '{/lightgrey-fg}'];
}

// ── Picker (ambiguity / favorites / history) ──────────────────────────────────
export function runPicker(matches: string[], title: string = 'Select', query?: string): void {
  const screen = blessed.screen({ smartCSR: true, title: `NCD - ${title}`, fullUnicode: true, output: process.stderr });

  const firstName = path.basename(matches[0]);
  const isAmbiguous = matches.every(m => path.basename(m).toLowerCase() === firstName.toLowerCase());
  const headerContent = isAmbiguous
    ? `  NCD - Ambiguous: ${matches.length} directories named "${firstName}"`
    : `  NCD - ${title} (${matches.length})`;

  const header  = blessed.box({ top: 0, left: 0, width: '100%', height: 1, content: headerContent, style: { fg: 'black', bg: 'cyan', bold: true } });
  const list    = blessed.list({
    top: 1, left: 0, width: '100%', bottom: 3,
    scrollable: true, keys: false, mouse: false,
    tags: true,
    items: matches.map(m => {
      const [open, close] = getPickerLineColor(m);
      return `${open}  ${path.basename(m)}  \u2192  ${path.dirname(m)}${close}`;
    }),
    style: { fg: 'white', bg: 'black', selected: { fg: 'black', bg: 'green', bold: true } },
  });
  const pathBar = blessed.box({ bottom: 2, left: 0, width: '100%', height: 1, content: `  Path: ${matches[0]}`, style: { fg: 'white', bg: 'blue' } });
  const helpBox = blessed.box({ bottom: 1, left: 0, width: '100%', height: 1, content: '  \u2191\u2193/jk Navigate   Enter Select   Esc/Q Cancel', style: { fg: 'black', bg: 'white' } });
  const status  = blessed.box({ bottom: 0, left: 0, width: '100%', height: 1, content: `  1/${matches.length}`, style: { fg: 'white', bg: 'black' } });

  screen.append(header);
  screen.append(list);
  screen.append(pathBar);
  screen.append(helpBox);
  screen.append(status);

  let idx = 0;
  function updateSelection(newIdx: number) {
    idx = newIdx;
    list.select(idx);
    pathBar.setContent(`  Path: ${matches[idx]}`);
    status.setContent(`  ${idx + 1}/${matches.length}`);
    screen.render();
  }

  screen.key(['up',   'k'], () => { if (idx > 0) updateSelection(idx - 1); });
  screen.key(['down', 'j'], () => { if (idx < matches.length - 1) updateSelection(idx + 1); });
  screen.key(['enter'],     () => {
    screen.destroy();
    if (query) saveLastSelection(query, matches[idx]);
    goToPath(matches[idx]);
  });
  screen.key(['escape', 'q', 'Q', 'C-c'], () => { screen.destroy(); process.exit(0); });

  let initialIdx = 0;
  if (query) {
    const lastPath = getLastSelection(query);
    if (lastPath) {
      const found = matches.findIndex(m => m.toLowerCase() === lastPath.toLowerCase());
      if (found !== -1) initialIdx = found;
    }
  }

  updateSelection(initialIdx);
  list.focus();
}
