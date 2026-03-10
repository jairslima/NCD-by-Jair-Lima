#!/usr/bin/env node
import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { runApp } from './ui/app';

program
  .name('ncd')
  .description('NCD - New Change Directory. Visual directory navigator inspired by Norton NCD.')
  .version('1.0.0')
  .argument('[directory]', 'starting directory (default: current directory)', process.cwd())
  .action((directory: string) => {
    const startPath = path.resolve(directory);
    if (!fs.existsSync(startPath)) {
      console.error(`Error: directory not found: ${startPath}`);
      process.exit(1);
    }
    runApp(startPath);
  });

program.parse();
