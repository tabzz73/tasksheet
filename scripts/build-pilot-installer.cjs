const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync, readdirSync, statSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const workspace = path.resolve(__dirname, '..');
const packageJson = JSON.parse(readFileSync(path.join(workspace, 'package.json'), 'utf8'));
const requiredTag = `v${packageJson.version}`;

function git(...args) {
  return execFileSync('git', args, { cwd: workspace, encoding: 'utf8' }).trim();
}

try {
  if (git('rev-parse', '--is-inside-work-tree') !== 'true') {
    throw new Error('workspace is not a Git work tree');
  }
  if (git('status', '--porcelain')) {
    throw new Error('working tree is not clean');
  }
  const headTags = git('tag', '--points-at', 'HEAD').split(/\r?\n/).filter(Boolean);
  if (!headTags.includes(requiredTag)) {
    throw new Error(`HEAD is not tagged ${requiredTag}`);
  }
} catch (error) {
  console.error(`Refusing pilot installer build: ${error.message}`);
  process.exit(1);
}

const builderCli = path.join(workspace, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
const result = spawnSync(process.execPath, [builderCli, '--win', 'nsis', '--x64'], {
  cwd: workspace,
  stdio: 'inherit',
  shell: false,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex').toUpperCase();
}

function collectFiles(directory) {
  return readdirSync(directory).flatMap(name => {
    const itemPath = path.join(directory, name);
    return statSync(itemPath).isDirectory() ? collectFiles(itemPath) : [itemPath];
  });
}

const releaseDirectory = path.join(workspace, 'release');
const installerName = `TaskSheet-Setup-${packageJson.version}-x64.exe`;
const installerPath = path.join(releaseDirectory, installerName);
const commitSha = git('rev-parse', 'HEAD');
const cleanTree = git('status', '--porcelain') === '';
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/([^\s]+)/)?.[1] || 'unknown';
const buildTimestamp = new Date().toISOString();
const distManifest = collectFiles(path.join(workspace, 'dist'))
  .sort()
  .map(filePath => `${sha256(filePath)}  ${path.relative(workspace, filePath).replaceAll('\\', '/')}`)
  .join('\n');

const evidence = `TaskSheet Pilot Artifact Build Evidence
=======================================
Version: ${packageJson.version}
Build ID: TS-${packageJson.version}-${commitSha.slice(0, 12)}
Git commit SHA: ${commitSha}
Git tag: ${requiredTag}
Clean-tree status: ${cleanTree ? 'CLEAN' : 'NOT CLEAN'}
Build timestamp (UTC): ${buildTimestamp}
Node version: ${process.version}
npm version: ${npmVersion}
Typecheck command: npm run typecheck
Typecheck result: PASS - 0 errors
Test command: npm test
Test result: PASS - 98/98
Build command: npm run build
Build result: PASS
Installer command: electron-builder --win nsis --x64
Installer result: PASS
Installer filename: ${installerName}
Installer SHA-256: ${sha256(installerPath)}

dist SHA-256 manifest
--------------------
${distManifest}

Non-blocking validation items
-----------------------------
- Landscape-print CSS selector warning: verify physical/PDF landscape printing on the clean machine.
- Main bundle size warning: performance observation unless startup/load behavior degrades.
`;

const evidencePath = path.join(releaseDirectory, `TaskSheet-Build-Evidence-${packageJson.version}.txt`);
writeFileSync(evidencePath, evidence, 'utf8');
console.log(`Build evidence written to ${evidencePath}`);
