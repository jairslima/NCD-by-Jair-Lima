import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { addToHistory } from './history';

export function goToPath(dirPath: string): void {
  addToHistory(dirPath);
  const lastFile = path.join(os.homedir(), '.ncd_last');
  fs.writeFileSync(lastFile, dirPath, 'utf8');
  process.stderr.write('\nNCD by Jair Lima\n');
  process.exit(0);
}
