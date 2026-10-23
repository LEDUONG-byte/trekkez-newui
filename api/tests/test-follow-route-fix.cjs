const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'api/services/community/social-supabase.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;
function harness({ confirm = true } = {}) {
  let present = false;
  let reads = 0;
  const calls = [];
  const supabaseRequest = async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url.includes('user_follows?on_conflict=')) {
      if (confirm) present = true;
      return null;
    }
    if (opts.method === 'DELETE') {
      if (confirm) present = false;
      return null;
    }
    if (url.includes('&select=follower_id,following_id&limit=1')) {
      reads++;
      return present ? [{ follower_id: 'viewer-1', following_id: 'target-1' }] : [];
    }
    throw new Error('Unexpected request: ' + url);
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === '../auth/auth-session') return { getAuthSession: async () => ({ userId: 'viewer-1', accessToken: 'fake-token' }) };
    if (name === '../core/supabase-client') return { supabaseRequest };
    throw new Error('Unexpected import: ' + name);
  }, mod, mod.exports);
  return { set: mod.exports.setUserFollowing, calls, getReads: () => reads };
}
(async () => {
  const ok = harness();
  await ok.set('target-1', true);
  await ok.set('target-1', false);
  assert.equal(ok.getReads(), 2, 'Follow/unfollow both require a read-back');
  const deny = harness({ confirm: false });
  await assert.rejects(deny.set('target-1', true), /chưa xác nhận/);
  const screen = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
  assert.match(screen, /followedAuthorIds\.has\(item\.authorId\)/, 'Following must be filtered by real author ID');
  assert.match(screen, /setFollowedAuthorIds\(new Set\(authorIds\)\)/);
  assert.match(screen, /inconsistentOwners/, 'Display-author mismatch diagnostic is present');
  console.log('PASS: Follow/unfollow read-back, deny handling, Following author-ID filter. No live writes.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
