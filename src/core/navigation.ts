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
  const shellHelp = process.platform === 'win32'
    ? 'No PowerShell, confirme que a funcao do perfil esta carregada; se "Get-Command ncd" apontar para ncd.ps1, o shell atual nao vai mudar de pasta.\n'
    : '';
  process.stderr.write(
    '\nNCD by Jair Lima\n' +
    `Diretorio selecionado: ${dirPath}\n` +
    'Se o shell atual nao mudou de pasta, execute "ncd setup" e abra um novo terminal.\n' +
    shellHelp
  );
  process.exit(0);
}
