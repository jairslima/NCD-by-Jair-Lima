#!/usr/bin/env node
import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { runApp, runPicker } from './ui/app';
import { runSetup } from './setup';
import { findDirectories } from './core/search';
import { indexExists, isDirInIndex, buildIndex } from './core/index-manager';
import { goToPath } from './core/navigation';

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

    // ── Case 1: no argument — open TUI, rebuild index if current dir is new ──
    if (!directory || directory === process.cwd()) {
      const cwd = process.cwd();

      if (!indexExists() || !isDirInIndex(cwd)) {
        process.stderr.write('Building index (first run or new directory)...\n');
        let lastMsg = '';
        const count = buildIndex((current, n) => {
          const msg = `  Scanning... ${n} dirs found\r`;
          if (msg !== lastMsg) {
            process.stderr.write(msg);
            lastMsg = msg;
          }
        });
        process.stderr.write(`\n  Index built: ${count} directories\n\n`);
      }

      runApp(cwd);
      return;
    }

    // ── Case 2: argument is a valid path — open TUI there ────────────────────
    const startPath = path.resolve(directory);
    if (fs.existsSync(startPath)) {
      runApp(startPath);
      return;
    }

    // ── Case 3: argument is a name — search index (or disk) ──────────────────
    process.stderr.write(`Searching for "${directory}"...\n`);
    const matches = findDirectories(directory);

    if (matches.length === 0) {
      process.stderr.write(`\nNCD by Jair Lima\nDirectory "${directory}" not found.\n`);
      process.exit(1);
    }

    if (matches.length === 1) {
      goToPath(matches[0]);
      return;
    }

    // Multiple matches — show picker
    runPicker(matches);
  });

program.parse();
