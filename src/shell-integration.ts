import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export const SHELL_MARKER = '# NCD - New Change Directory (by Jair Lima)';

export const BASH_FUNCTION = `
${SHELL_MARKER}
function ncd() {
  command ncd "$@"
  local NCD_PATH=$(cat ~/.ncd_last 2>/dev/null)
  if [ -n "$NCD_PATH" ]; then
    cd "$NCD_PATH"
    rm -f ~/.ncd_last
  fi
}
`;

export const POWERSHELL_FUNCTION = `
${SHELL_MARKER}
function ncd {
  if (Get-Command ncd.ps1 -ErrorAction SilentlyContinue) {
    & ncd.ps1 @args
  } else {
    & (Get-Command ncd -CommandType Application) @args
  }
  $p = Get-Content "$HOME\\.ncd_last" -ErrorAction SilentlyContinue
  if ($p) { Set-Location $p; Remove-Item "$HOME\\.ncd_last" -ErrorAction SilentlyContinue }
}
`;

export function buildCmdWrapper(nodeModulesPath: string): string {
  const indexJs = path.join(nodeModulesPath, 'ncd-by-jair-lima', 'dist', 'index.js')
    .replace(/\//g, '\\');

  return `@echo off
:: NCD - New Change Directory (by Jair Lima)
node "${indexJs}" %*
if not exist "%USERPROFILE%\\.ncd_last" goto :eof
set /p NCD_PATH=<"%USERPROFILE%\\.ncd_last"
del "%USERPROFILE%\\.ncd_last"
cd /d "%NCD_PATH%"
`;
}

export function getNpmGlobalPaths(): { binDir: string; nodeModulesDir: string } | null {
  try {
    const prefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
    const binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
    const nodeModulesDir = path.join(prefix, 'node_modules');
    return { binDir, nodeModulesDir };
  } catch {
    return null;
  }
}

export function appendIfMissing(profilePath: string, content: string): 'added' | 'already' | 'failed' | 'updated' {
  try {
    fs.mkdirSync(path.dirname(profilePath), { recursive: true });
    const existing = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, 'utf8') : '';
    
    const blockRegex = new RegExp(SHELL_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?\\n}', 'g');
    
    if (existing.includes(SHELL_MARKER)) {
      const updated = existing.replace(blockRegex, content.trim());
      if (updated !== existing) {
        fs.writeFileSync(profilePath, updated, 'utf8');
        return 'updated';
      }
      return 'already';
    }
    
    fs.appendFileSync(profilePath, '\n' + content.trim() + '\n', 'utf8');
    return 'added';
  } catch {
    return 'failed';
  }
}

export function installCmdWrapper(): string | null {
  const npmPaths = getNpmGlobalPaths();
  if (!npmPaths) return null;

  const { binDir, nodeModulesDir } = npmPaths;
  const cmdPath = path.join(binDir, 'ncd.cmd');
  const wrapper = buildCmdWrapper(nodeModulesDir);
  fs.writeFileSync(cmdPath, wrapper, 'utf8');
  return cmdPath;
}
