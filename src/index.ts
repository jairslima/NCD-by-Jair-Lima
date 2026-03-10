#!/usr/bin/env node
import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { runApp, runPicker } from './ui/app';
import { runSetup } from './setup';
import { findDirectories } from './core/search';

program
  .name('ncd')
  .description('NCD - New Change Directory. Visual directory navigator inspired by Norton NCD.')
  .version('1.0.0');

program
  .command('setup')
  .description('Install shell integration (cd support) for bash, PowerShell and CMD')
  .action(() => runSetup());

program
  .command('go [directory]', { isDefault: true })
  .description('Open directory navigator')
  .action((directory: string = process.cwd()) => {
    // No argument — open TUI from current directory
    if (!directory || directory === process.cwd()) {
      runApp(process.cwd());
      return;
    }

    const startPath = path.resolve(directory);

    // Argument is a valid existing path — open TUI there
    if (fs.existsSync(startPath)) {
      runApp(startPath);
      return;
    }

    // Argument is a name — search the disk for a matching directory
    process.stderr.write(`Searching for "${directory}"...\n`);
    const matches = findDirectories(directory);

    if (matches.length === 0) {
      process.stderr.write(`NCD: no directory named "${directory}" found.\n`);
      process.exit(1);
    }

    if (matches.length === 1) {
      // Single match — go directly, no TUI needed
      goToPath(matches[0]);
      return;
    }

    // Multiple matches — show a simple picker
    runPicker(matches);
  });

export function goToPath(dirPath: string): void {
  const lastFile = path.join(os.homedir(), '.ncd_last');
  fs.writeFileSync(lastFile, dirPath, 'utf8');
  process.stderr.write('\nNCD by Jair Lima\n');
  process.exit(0);
}

program.parse();
