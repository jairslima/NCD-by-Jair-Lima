const SKIPPED_DIRECTORY_NAMES = new Set([
  '.git',
  '.svn',
  '__pycache__',
  'node_modules',
  'vendor',
  '$RECYCLE.BIN',
  'System Volume Information',
  'Windows',
  'WinSxS',
  'SoftwareDistribution',
  'Prefetch',
  'Logs',
  'Temp',
  'temp',
]);

const ALLOWED_HIDDEN_DIRECTORY_NAMES = new Set([
  '.claude',
]);

interface DirectoryRuleOptions {
  includeHidden?: boolean;
}

export function isHiddenDirectoryName(name: string): boolean {
  return name.startsWith('.');
}

export function shouldSkipDirectoryName(name: string, options: DirectoryRuleOptions = {}): boolean {
  if (SKIPPED_DIRECTORY_NAMES.has(name)) return true;
  if (options.includeHidden) return false;
  return isHiddenDirectoryName(name) && !ALLOWED_HIDDEN_DIRECTORY_NAMES.has(name);
}
