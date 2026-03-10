#!/usr/bin/env node
import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { runApp } from './ui/app';
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
    const startPath = path.resolve(directory);

    if (fs.existsSync(startPath)) {
      // Valid path — open directly
      runApp(startPath);
      return;
    }

    // Not a valid path — search the disk for a folder with that name
    process.stderr.write(`Searching for "${directory}"...\n`);
    const matches = findDirectories(directory);

    if (matches.length === 0) {
      process.stderr.write(`NCD: no directory named "${directory}" found.\n`);
      process.exit(1);
    }

    if (matches.length === 1) {
      // Single match — go directly
      runApp(matches[0]);
      return;
    }

    // Multiple matches — open the parent of the first match so user can pick
    // Show all matches as a list starting from the common ancestor
    const commonRoot = findCommonRoot(matches);
    runApp(commonRoot);
  });

function findCommonRoot(paths: string[]): string {
  if (paths.length === 0) return process.cwd();
  const parts = paths[0].split(path.sep);
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join(path.sep) || path.parse(paths[0]).root;
    if (paths.every(p => p.startsWith(candidate))) return candidate;
  }
  return path.parse(paths[0]).root;
}

program.parse();
