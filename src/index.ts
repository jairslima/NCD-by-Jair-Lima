#!/usr/bin/env node
import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { runApp, runPicker } from './ui/app';
import { runSetup } from './setup';
import { findDirectoriesAsync } from './core/search';
import { indexExists, isDirInIndex, buildIndexAsync, scanAndAddToIndex } from './core/index-manager';
import { goToPath } from './core/navigation';

function isInteractiveTerminalSupported(): boolean {
  if (!process.stdin.isTTY || !process.stderr.isTTY) return false;

  const hostName = process.env.TERM_PROGRAM || process.env.WT_SESSION || '';
  if (hostName) return true;

  const parent = (process.env.PSCONSOLEHOSTREADLINE || process.env.TERM || '').toLowerCase();
  if (parent && parent !== 'dumb') return true;

  return !process.env.PSModulePath?.includes('PowerShell_ISE');
}

function printInteractiveHostError(): never {
  process.stderr.write(
    '\nNCD by Jair Lima\n' +
    'Interactive mode requires a real terminal with TTY support.\n' +
    'PowerShell ISE is not supported for the TUI.\n' +
    'Use Windows Terminal, PowerShell console, or pwsh.\n' +
    'To enable changing directories in the current shell, run: ncd setup\n\n'
  );
  process.exit(1);
}

program
  .name('ncd')
  .description('NCD - New Change Directory. Visual directory navigator inspired by Norton NCD.')
  .version('1.0.0');

program
  .command('setup')
  .description('Install shell integration (cd support) for bash, PowerShell and CMD')
  .action(() => runSetup());

program
  .command('go [directory...]', { isDefault: true })
  .description('Open directory navigator')
  .action(async (words: string[] = []) => {
    const directory = words.length > 0 ? words.join(' ') : process.cwd();

    // ── Case 1: no argument — open full drive tree, highlight current dir ────
    if (!directory || directory === process.cwd()) {
      if (!isInteractiveTerminalSupported()) {
        printInteractiveHostError();
      }

      const cwd = process.cwd();
      const driveRoot = path.parse(cwd).root; // e.g. "C:\"

      if (!indexExists()) {
        process.stderr.write('Building index (first run)...\n');
        const count = await buildIndexAsync((_, n) => {
          process.stderr.write(`  Scanning... ${n} dirs found\r`);
        });
        process.stderr.write(`\n  Index built: ${count} directories\n\n`);
      } else if (!isDirInIndex(cwd)) {
        process.stderr.write(`Indexing new directory: ${cwd}\n`);
        const added = scanAndAddToIndex(cwd);
        if (added > 0) process.stderr.write(`  Added ${added} directories to index\n\n`);
      }

      // Open from drive root, pre-expand to current directory
      runApp(driveRoot, cwd);
      return;
    }

    // ── Case 2: argument is a valid path — open TUI there ────────────────────
    const startPath = path.resolve(directory);
    if (fs.existsSync(startPath)) {
      if (!isInteractiveTerminalSupported()) {
        printInteractiveHostError();
      }

      runApp(startPath);
      return;
    }

    // ── Case 3: argument is a name — search index (or disk) ──────────────────
    process.stderr.write(`Searching for "${directory}"...\n`);
    const matches = await findDirectoriesAsync(directory);

    if (matches.length === 0) {
      process.stderr.write(`\nNCD by Jair Lima\nPasta nao encontrada: "${directory}"\n`);
      process.exit(1);
    }

    if (matches.length === 1) {
      goToPath(matches[0]);
      return;
    }

    // Multiple matches — show picker
    if (!isInteractiveTerminalSupported()) {
      printInteractiveHostError();
    }

    runPicker(matches);
  });

program.parse();
