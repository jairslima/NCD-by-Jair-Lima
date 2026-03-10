import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const HISTORY_FILE = path.join(os.homedir(), '.ncd_history.json');
const MAX_HISTORY = 20;

export function loadHistory(): string[] {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function addToHistory(dirPath: string): void {
  const history = loadHistory().filter(h => h.toLowerCase() !== dirPath.toLowerCase());
  history.unshift(dirPath);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, MAX_HISTORY), null, 2), 'utf8');
}
