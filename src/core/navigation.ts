import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { addToHistory } from './history';

export function goToPath(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    process.stderr.write(`\nNCD by Jair Lima\nPasta não encontrada no disco: "${dirPath}"\n`);
    process.exit(1);
  }
  addToHistory(dirPath);
  const lastFile = path.join(os.homedir(), '.ncd_last');
  fs.writeFileSync(lastFile, dirPath, 'utf8');
  process.stderr.write(
    '\nNCD by Jair Lima\n' +
    `Diretorio selecionado: ${dirPath}\n` +
    'Se o shell atual nao mudou de pasta, execute "ncd setup" e abra um novo terminal.\n'
  );
  process.exit(0);
}
