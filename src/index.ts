#!/usr/bin/env node
import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { runApp } from './ui/app';
import { runSetup } from './setup';

program
  .name('ncd')
  .description('NCD - New Change Directory. Visual directory navigator inspired by Norton NCD.')
  .version('1.0.0');

program
  .command('setup')
  .description('Install shell integration (cd support) for bash and PowerShell')
  .action(() => runSetup());

program
  .command('go [directory]', { isDefault: true })
  .description('Open directory navigator (default command)')
  .action((directory: string = process.cwd()) => {
    const startPath = path.resolve(directory);
    if (!fs.existsSync(startPath)) {
      console.error(`Error: directory not found: ${startPath}`);
      process.exit(1);
    }
    runApp(startPath);
  });

program.parse();
