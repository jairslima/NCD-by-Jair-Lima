import { installCmdWrapper } from './shell-integration';

try {
  const cmdPath = installCmdWrapper();
  if (cmdPath) {
    console.log('NCD: CMD wrapper installed at ' + cmdPath);
  }
} catch {
  // Not critical — CMD users can run `ncd setup` manually
}
