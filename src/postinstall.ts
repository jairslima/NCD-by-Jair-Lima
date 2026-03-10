import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Custom ncd.cmd that captures stdout (selected path) and does cd /d
// This runs after `npm install -g` and replaces the auto-generated ncd.cmd
const CMD_WRAPPER = `@echo off
for /f "delims=" %%i in ('node "%~dp0node_modules\\ncd-by-jair-lima\\dist\\index.js" %*') do set NCD_RESULT=%%i
if defined NCD_RESULT (
  cd /d "%NCD_RESULT%"
)
`;

try {
  const npmBinDir = execSync('npm bin -g 2>/dev/null || npm prefix -g', { encoding: 'utf8' }).trim();
  // npm bin -g gives the bin dir directly on older npm, npm prefix -g gives prefix (need to append \bin on Windows)
  let binDir = npmBinDir;
  if (!binDir.endsWith('bin') && !binDir.endsWith('bin/') && !binDir.endsWith('bin\\')) {
    binDir = path.join(binDir, process.platform === 'win32' ? '' : 'bin');
  }

  const cmdPath = path.join(binDir, 'ncd.cmd');
  if (fs.existsSync(cmdPath)) {
    fs.writeFileSync(cmdPath, CMD_WRAPPER, 'utf8');
    console.log('NCD: CMD wrapper installed at ' + cmdPath);
  }
} catch {
  // Not critical — CMD users can run `ncd setup` manually
}
