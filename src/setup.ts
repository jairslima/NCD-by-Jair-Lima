import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const MARKER = '# NCD - New Change Directory (by Jair Lima)';

const BASH_FUNCTION = `
# NCD - New Change Directory (by Jair Lima)
function ncd() {
  command ncd "$@"
  local NCD_PATH=$(cat ~/.ncd_last 2>/dev/null)
  if [ -n "$NCD_PATH" ]; then
    cd "$NCD_PATH"
    rm -f ~/.ncd_last
  fi
}
`;

const POWERSHELL_FUNCTION = `
# NCD - New Change Directory (by Jair Lima)
function ncd {
  & ncd.cmd @args
  $p = Get-Content "$env:USERPROFILE\\.ncd_last" -ErrorAction SilentlyContinue
  if ($p) { Set-Location $p; Remove-Item "$env:USERPROFILE\\.ncd_last" -ErrorAction SilentlyContinue }
}
`;

// CMD wrapper: no SETLOCAL so cd /d persists to parent CMD session
function buildCmdWrapper(nodeModulesPath: string): string {
  const indexJs = path.join(nodeModulesPath, 'ncd-by-jair-lima', 'dist', 'index.js')
    .replace(/\//g, '\\');
  return `@echo off
:: NCD - New Change Directory (by Jair Lima)
node "${indexJs}" %*
if exist "%USERPROFILE%\\.ncd_last" (
  for /f "usebackq delims=" %%i in ("%USERPROFILE%\\.ncd_last") do cd /d "%%i"
  del /f /q "%USERPROFILE%\\.ncd_last" >nul 2>&1
)
`;
}

function getNpmGlobalPaths(): { binDir: string; nodeModulesDir: string } | null {
  try {
    const prefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
    const binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
    const nodeModulesDir = path.join(prefix, 'node_modules');
    return { binDir, nodeModulesDir };
  } catch {
    return null;
  }
}

export function runSetup(): void {
  const homeDir = os.homedir();
  console.log('NCD Setup — installing shell integration...\n');

  // ── Bash ──────────────────────────────────────────────────────────────────
  const bashProfiles = [path.join(homeDir, '.bash_profile'), path.join(homeDir, '.bashrc')];
  let bashDone = false;
  for (const profile of bashProfiles) {
    try {
      const content = fs.existsSync(profile) ? fs.readFileSync(profile, 'utf8') : '';
      if (content.includes(MARKER)) {
        console.log(`✓ Bash: already configured in ${profile}`);
        bashDone = true;
        break;
      }
      fs.appendFileSync(profile, BASH_FUNCTION, 'utf8');
      console.log(`✓ Bash: function added to ${profile}`);
      console.log(`  Activate now: source ${profile}`);
      bashDone = true;
      break;
    } catch { continue; }
  }
  if (!bashDone) console.log('✗ Bash: could not write profile');

  // ── PowerShell ────────────────────────────────────────────────────────────
  const psProfilePath = path.join(homeDir, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
  try {
    fs.mkdirSync(path.dirname(psProfilePath), { recursive: true });
    const psContent = fs.existsSync(psProfilePath) ? fs.readFileSync(psProfilePath, 'utf8') : '';
    if (psContent.includes(MARKER)) {
      console.log(`✓ PowerShell: already configured`);
    } else {
      fs.appendFileSync(psProfilePath, POWERSHELL_FUNCTION, 'utf8');
      console.log(`✓ PowerShell: function added to ${psProfilePath}`);
      console.log(`  Activate now: . $PROFILE`);
    }
  } catch { console.log('✗ PowerShell: could not write profile'); }

  // ── CMD (ncd.cmd in npm global bin) ───────────────────────────────────────
  const npmPaths = getNpmGlobalPaths();
  if (npmPaths) {
    const { binDir, nodeModulesDir } = npmPaths;
    const cmdPath = path.join(binDir, 'ncd.cmd');
    try {
      const wrapper = buildCmdWrapper(nodeModulesDir);
      fs.writeFileSync(cmdPath, wrapper, 'utf8');
      console.log(`✓ CMD: wrapper installed at ${cmdPath}`);
    } catch (e) {
      console.log(`✗ CMD: could not write ${cmdPath}`);
    }
  } else {
    console.log('✗ CMD: could not detect npm global path');
  }

  console.log('\nSetup complete! Restart your terminal or source your profile.');
}
