import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LAST_SELECTION_FILE = path.join(os.homedir(), '.ncd_last_selection.json');

function loadLastSelections(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(LAST_SELECTION_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function getLastSelection(query: string): string | undefined {
  return loadLastSelections()[query.toLowerCase()];
}

export function saveLastSelection(query: string, dirPath: string): void {
  const selections = loadLastSelections();
  selections[query.toLowerCase()] = dirPath;
  fs.writeFileSync(LAST_SELECTION_FILE, JSON.stringify(selections, null, 2), 'utf8');
}
