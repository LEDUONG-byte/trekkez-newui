const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../services/community/community-post-actions.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error).length, 0);

function loadService(userId = 'owner-1') {
  const requests = [];
  const service = {};
  new Function('exports', 'require', compiled.outputText)(service, (name) => {
    if (name === '../auth/auth-session') {
      return { getAuthSession: async () => ({ userId, accessToken: 'mock-token' }) };
    }
    if (name === '../core/supabase-client') {
      return {
        supabaseRequest: async (endpoint, options) => {
          requests.push({ endpoint, options });
        },
      };
    }
    throw new Error(`Unexpected import: ${name}`);
  });
  return { deletePost: service.deleteRemoteCommunityPost, requests };
}

(async () => {
  const { deletePost, requests } = loadService();
  await deletePost('post-1', 'owner-1');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].endpoint, '/rest/v1/rpc/delete_own_community_post');
  assert.equal(requests[0].options.body.p_post_id, 'post-1');
  assert.equal(requests[0].options.expectedUserId, 'owner-1');

  const changedSession = loadService('other-user');
  await assert.rejects(
    changedSession.deletePost('post-1', 'owner-1'),
    /Phiên đăng nhập đã thay đổi/,
  );
  assert.equal(changedSession.requests.length, 0);
  console.log('PASS: Community post deletion is sent through the owner-scoped RPC.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
