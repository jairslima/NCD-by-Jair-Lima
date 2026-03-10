import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

export function runSetup(): void {
  const homeDir = os.homedir();

  // Bash profiles to try
  const bashProfiles = [
    path.join(homeDir, '.bash_profile'),
    path.join(homeDir, '.bashrc'),
  ];

  const marker = '# NCD - New Change Directory (by Jair Lima)';
  let bashDone = false;

  for (const profile of bashProfiles) {
    try {
      let content = '';
      if (fs.existsSync(profile)) {
        content = fs.readFileSync(profile, 'utf8');
        if (content.includes(marker)) {
          console.log(`✓ Bash: already configured in ${profile}`);
          bashDone = true;
          break;
        }
      }
      fs.appendFileSync(profile, BASH_FUNCTION, 'utf8');
      console.log(`✓ Bash: function added to ${profile}`);
      console.log(`  Run: source ${profile}`);
      bashDone = true;
      break;
    } catch {
      continue;
    }
  }

  if (!bashDone) {
    console.log('✗ Bash: could not write to profile. Add manually:');
    console.log(BASH_FUNCTION);
  }

  // PowerShell profile
  const psProfilePath = path.join(homeDir, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
  const psProfileDir = path.dirname(psProfilePath);

  try {
    if (!fs.existsSync(psProfileDir)) fs.mkdirSync(psProfileDir, { recursive: true });
    let psContent = '';
    if (fs.existsSync(psProfilePath)) {
      psContent = fs.readFileSync(psProfilePath, 'utf8');
      if (psContent.includes(marker)) {
        console.log(`✓ PowerShell: already configured in ${psProfilePath}`);
      } else {
        fs.appendFileSync(psProfilePath, POWERSHELL_FUNCTION, 'utf8');
        console.log(`✓ PowerShell: function added to ${psProfilePath}`);
        console.log(`  Restart PowerShell or run: . $PROFILE`);
      }
    } else {
      fs.writeFileSync(psProfilePath, POWERSHELL_FUNCTION, 'utf8');
      console.log(`✓ PowerShell: profile created at ${psProfilePath}`);
      console.log(`  Restart PowerShell or run: . $PROFILE`);
    }
  } catch (e) {
    console.log('✗ PowerShell: could not write profile. Add manually:');
    console.log(POWERSHELL_FUNCTION);
  }

  console.log('\nSetup complete! Restart your terminal or source your profile.');
}
