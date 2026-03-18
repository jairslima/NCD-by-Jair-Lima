import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import {
  appendIfMissing,
  BASH_FUNCTION,
  installCmdWrapper,
  POWERSHELL_FUNCTION,
} from './shell-integration';

export function runSetup(): void {
  const homeDir = os.homedir();
  console.log('NCD Setup - installing shell integration...\n');

  const bashProfiles = [path.join(homeDir, '.bash_profile'), path.join(homeDir, '.bashrc')];
  let bashDone = false;
  for (const profile of bashProfiles) {
    const result = appendIfMissing(profile, BASH_FUNCTION);
    if (result === 'added' || result === 'updated') {
      console.log(`OK Bash: function ${result} in ${profile}`);
      console.log(`  Activate now: source ${profile}`);
      bashDone = true;
      break;
    } else if (result === 'already') {
      console.log(`OK Bash: already configured in ${profile}`);
      bashDone = true;
      break;
    }
  }
  if (!bashDone) console.log('ERR Bash: could not write profile');

  const psProfilePaths = [
    path.join(homeDir, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1'),
    path.join(homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
    path.join(homeDir, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShellISE_profile.ps1'),
  ];
  let psAdded = 0;
  let psAlready = 0;
  for (const psProfilePath of psProfilePaths) {
    const result = appendIfMissing(psProfilePath, POWERSHELL_FUNCTION);
    if (result === 'added' || result === 'updated') {
      psAdded++;
      console.log(`OK PowerShell: function ${result} in ${psProfilePath}`);
    } else if (result === 'already') {
      psAlready++;
      console.log(`OK PowerShell: already configured in ${psProfilePath}`);
    }
  }
  if (psAdded === 0 && psAlready === 0) {
    console.log('ERR PowerShell: could not write any profile');
  } else {
    console.log('  Activate now: restart the terminal or run . $PROFILE');
    console.log('  Note: PowerShell ISE can load the function, but the full-screen TUI still requires a real terminal.');
    console.log('  If "Get-Command ncd" still points to ncd.ps1, the profile function is not loaded in the current session.');
  }

  // Fix execution policy for CurrentUser so the profile can load
  if (process.platform === 'win32') {
    try {
      execSync(
        'powershell.exe -NoProfile -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"',
        { stdio: 'pipe' }
      );
      console.log('OK ExecutionPolicy: RemoteSigned set for CurrentUser (profile will load on next terminal)');
    } catch {
      console.log('WARN ExecutionPolicy: could not set automatically. Run manually:');
      console.log('  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force');
    }
  }

  try {
    const cmdPath = installCmdWrapper();
    if (cmdPath) {
      console.log(`OK CMD: wrapper installed at ${cmdPath}`);
    } else {
      console.log('ERR CMD: could not detect npm global path');
    }
  } catch {
    console.log('ERR CMD: could not detect npm global path');
  }

  console.log('\nSetup complete! Restart your terminal or source your profile.');
}
