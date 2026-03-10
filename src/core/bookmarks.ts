import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const BOOKMARKS_FILE = path.join(os.homedir(), '.ncd_bookmarks.json');

export function loadBookmarks(): string[] {
  try {
    return JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function toggleBookmark(dirPath: string): boolean {
  const bookmarks = loadBookmarks();
  const idx = bookmarks.findIndex(b => b.toLowerCase() === dirPath.toLowerCase());
  if (idx !== -1) {
    bookmarks.splice(idx, 1);
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2), 'utf8');
    return false; // removed
  }
  bookmarks.unshift(dirPath);
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2), 'utf8');
  return true; // added
}
