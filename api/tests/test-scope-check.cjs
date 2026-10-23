const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'trekkez-scope-test-'));
const bare = path.join(temp, 'origin.git');
const repo = path.join(temp, 'repo');
const script = path.resolve(__dirname, '../scripts/check-scope.cjs');
const runGit = (cwd, args) => execFileSync('git', args, { cwd, stdio: 'ignore' });

try {
  runGit(temp, ['init', '--bare', '--initial-branch=main', bare]);
  runGit(temp, ['clone', bare, repo]);
  runGit(repo, ['config', 'user.name', 'Scope Test']);
  runGit(repo, ['config', 'user.email', 'scope-test@example.invalid']);

  fs.mkdirSync(path.join(repo, 'api'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'api', 'base.txt'), 'base\n');
  runGit(repo, ['add', 'api/base.txt']);
  runGit(repo, ['commit', '-m', 'baseline']);
  runGit(repo, ['push', '-u', 'origin', 'main']);
  runGit(repo, ['switch', '-c', 'feat/api']);
  fs.writeFileSync(path.join(repo, 'api', 'change.txt'), 'backend\n');
  runGit(repo, ['add', 'api/change.txt']);
  runGit(repo, ['commit', '-m', 'api change']);

  fs.mkdirSync(path.join(repo, 'app'), { recursive: true });
  const untrackedUi = path.join(repo, 'app', 'new-screen.tsx');
  fs.writeFileSync(untrackedUi, 'export {};\n');
  let result = spawnSync(process.execPath, [script], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /app[\\/]new-screen\.tsx/);

  fs.rmSync(untrackedUi);
  result = spawnSync(process.execPath, [script], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /PASS:/);
  console.log('PASS API scope guard: detects untracked UI files and allows API-only changes.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
