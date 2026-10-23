// From repo root: node api/scripts/check-scope.cjs
// This refuses a merge if tracked differences outside api/ appear relative to main.
const cp = require('node:child_process');
function git(args) { return cp.execFileSync('git', args, {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim(); }
try {
  const base = git(['merge-base', 'HEAD', 'origin/main']);
  const tracked = git(['diff', '--name-only', base, 'HEAD']).split('\n').filter(Boolean);
  const pending = git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean);
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  const changed = [...new Set([...tracked, ...pending, ...staged, ...untracked])];
  const other = changed.filter(p => !p.startsWith('api/'));
  if (other.length) {
    console.error('BLOCKED: changes outside api/:\n' + other.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${changed.length} changed tracked files; all within api/`);
  }
} catch(e) {
  console.error('Cannot verify against origin/main. Run git fetch origin main first.');
  process.exitCode = 2;
}
