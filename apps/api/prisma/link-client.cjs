const fs = require('fs');
const path = require('path');

const clientDir = fs.realpathSync(path.dirname(require.resolve('@prisma/client/package.json')));
const generated = path.join(clientDir, '..', '..', '.prisma');
if (!fs.existsSync(generated)) {
  console.warn('Prisma generated client not found at', generated);
  process.exit(0);
}

const apiRoot = path.join(__dirname, '..');
const workspaceRoot = path.join(apiRoot, '..', '..');
for (const target of [path.join(apiRoot, 'node_modules', '.prisma'), path.join(workspaceRoot, 'node_modules', '.prisma')]) {
  try {
    if (fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(generated, target, 'junction');
  } catch (err) {
    console.warn('Could not link Prisma client to', target, err instanceof Error ? err.message : err);
  }
}
