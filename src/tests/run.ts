import assert from 'node:assert/strict';
import { rankDirectoryMatches, scoreDirectoryMatch } from '../core/index-manager';
import { isHiddenDirectoryName, shouldSkipDirectoryName } from '../core/directory-rules';
import { buildCmdWrapper } from '../shell-integration';
import { compactRoots } from '../core/root-utils';

async function run(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  process.stdout.write(`PASS ${name}\n`);
}

async function main(): Promise<void> {
await run('directory ranking keeps exact match ahead of prefix and substring matches', () => {
  const dirs = [
    'C:\\Work\\alpha-tools',
    'C:\\Work\\alpha',
    'C:\\Work\\my-alpha-folder',
    'C:\\Work\\alphabet',
  ];

  const ranked = rankDirectoryMatches(dirs, 'alpha');

  assert.deepEqual(ranked, [
    'C:\\Work\\alpha',
    'C:\\Work\\alphabet',
    'C:\\Work\\alpha-tools',
    'C:\\Work\\my-alpha-folder',
  ]);
});

await run('token prefix matches rank above plain substring matches', () => {
  const tokenScore = scoreDirectoryMatch('C:\\Work\\visual-studio-code', 'visual code');
  const substringScore = scoreDirectoryMatch('C:\\Work\\myvisual-filecode', 'visual code');

  assert.ok(tokenScore > substringScore);
});

await run('directory rules skip system folders and most hidden folders by default', () => {
  assert.equal(shouldSkipDirectoryName('node_modules'), true);
  assert.equal(shouldSkipDirectoryName('.git'), true);
  assert.equal(shouldSkipDirectoryName('.cache'), true);
  assert.equal(shouldSkipDirectoryName('.claude'), false);
});

await run('directory rules can keep hidden folders visible for the interactive tree', () => {
  assert.equal(isHiddenDirectoryName('.env'), true);
  assert.equal(shouldSkipDirectoryName('.env', { includeHidden: true }), false);
  assert.equal(shouldSkipDirectoryName('Documents', { includeHidden: true }), false);
});

await run('cmd wrapper uses the .ncd_last contract shared with setup', () => {
  const wrapper = buildCmdWrapper('C:\\npm\\node_modules');

  assert.ok(wrapper.includes('node "C:\\npm\\node_modules\\ncd-by-jair-lima\\dist\\index.js" %*'));
  assert.ok(wrapper.includes('%USERPROFILE%\\.ncd_last'));
  assert.ok(wrapper.includes('cd /d "%%i"'));
});

await run('compactRoots removes nested scan roots to avoid redundant traversal', () => {
  const compacted = compactRoots([
    'C:\\Users\\jairs\\Claude\\ncd',
    'C:\\Users\\jairs',
    'C:\\',
    'C:\\Users',
    'C:\\Users\\jairs\\Documents',
  ]);

  assert.deepEqual(compacted, ['c:\\']);
});

process.stdout.write('All regression checks passed.\n');
}

main().catch(error => {
  process.stderr.write(String(error) + '\n');
  process.exit(1);
});
