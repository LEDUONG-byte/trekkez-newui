const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../services/account/account-supabase.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(options = {}) {
  const profile = {
    id: 'user-1', username: 'old-name', full_name: 'Old Name', avatar_url: null,
    bio: null, phone: null, role: 'member',
  };
  const calls = [];
  const supabaseRequest = async (url, request = {}) => {
    calls.push({ url, request });
    if (request.method === 'PATCH') {
      if (options.zeroRows) return null;
      Object.assign(profile, request.body);
      return null;
    }
    if (url.startsWith('/rest/v1/profiles?')) {
      return options.noProfile ? [] : [{ ...profile }];
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === '../core/supabase-base') return { SUPABASE_URL: 'https://test.supabase.co' };
    if (name === '../core/supabase-client') return { supabaseRequest, uploadSupabaseStorageFile: async () => '' };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('require', 'module', 'exports', compiled)(requireMock, module, module.exports);
  return { updateProfile: module.exports.updateProfile, calls, profile };
}

(async () => {
  const ok = load();
  const updated = await ok.updateProfile('token', 'user-1', { full_name: 'New Name', bio: null });
  assert.equal(updated.full_name, 'New Name');
  assert.equal(updated.bio, null);
  assert.equal(ok.calls[0].request.expectedUserId, 'user-1');
  assert.equal(ok.calls[1].request.expectedUserId, 'user-1');

  const denied = load({ zeroRows: true });
  await assert.rejects(denied.updateProfile('token', 'user-1', { full_name: 'New Name' }), /chưa xác nhận trường Profile/);

  const missing = load({ noProfile: true });
  await assert.rejects(missing.updateProfile('token', 'user-1', { full_name: 'New Name' }), /chưa xác nhận hồ sơ/);

  const invalid = load();
  await assert.rejects(invalid.updateProfile('token', 'user-1', { role: 'admin' }), /không được phép cập nhật/);
  assert.equal(invalid.calls.length, 0);
  await assert.rejects(invalid.updateProfile('token', 'user-1', {}), /Không có trường/);
  assert.equal(invalid.calls.length, 0);
  console.log('PASS profile update: owner scope, read-back confirmation, empty patch and protected-field rejection. Mock only.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
