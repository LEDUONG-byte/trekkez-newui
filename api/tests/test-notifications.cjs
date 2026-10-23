const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../services/notifications/notifications-supabase.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error).length, 0);

let requestedPath = '';
let requestOptions;
const service = {};
new Function('exports', 'require', compiled.outputText)(service, (name) => {
  if (name === '../auth/auth-session') {
    return { getAuthSession: async () => ({ userId: 'viewer-1', accessToken: 'mock-token' }) };
  }
  if (name === '../core/supabase-client') {
    return {
      getAllSupabaseRows: async (apiPath, options) => {
        requestedPath = apiPath;
        requestOptions = options;
        return [{
          id: 'notification-1',
          title: 'Team update',
          body: 'A request was declined.',
          type: 'team',
          target_id: 'team-1',
          created_at: '2026-10-23T00:00:00Z',
        }];
      },
    };
  }
  throw new Error(`Unexpected import: ${name}`);
});

(async () => {
  const rows = await service.getRemoteNotifications();
  assert.match(requestedPath, /user_id=eq\.viewer-1/);
  assert.match(requestedPath, /order=created_at\.desc/);
  assert.equal(requestOptions.expectedUserId, 'viewer-1');
  assert.deepEqual(rows, [{
    id: 'notification-1',
    title: 'Team update',
    body: 'A request was declined.',
    type: 'team',
    targetId: 'team-1',
    createdAt: '2026-10-23T00:00:00Z',
  }]);
  await assert.rejects(
    service.getRemoteNotifications('different-user'),
    /Phiên đăng nhập đã thay đổi/,
  );
  console.log('PASS: Notifications are scoped to the current user and mapped from Supabase.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
