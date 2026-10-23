const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../services/core/supabase-client.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(responses) {
  const calls = [];
  const rawSupabaseRequest = async (url, options) => {
    calls.push({ url, options });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return { response: { status: 200, ok: true }, data: response };
  };
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === './supabase-base') {
      return {
        SUPABASE_URL: 'https://test.supabase.co',
        getSupabaseErrorMessage: () => 'request failed',
        rawSupabaseRequest,
      };
    }
    if (name === '../auth/auth-session') {
      return { getAuthSession: async () => null, forceRefreshAuthSession: async () => null };
    }
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('require', 'module', 'exports', compiled)(requireMock, module, module.exports);
  return { getAllSupabaseRows: module.exports.getAllSupabaseRows, calls };
}

(async () => {
  const paged = load([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
  const rows = await paged.getAllSupabaseRows('/rest/v1/items?select=id&limit=10&offset=20', {
    accessToken: 'test-token', pageSize: 2,
  });
  assert.deepEqual(rows, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.equal(paged.calls.length, 2);
  const first = new URLSearchParams(paged.calls[0].url.split('?')[1]);
  const second = new URLSearchParams(paged.calls[1].url.split('?')[1]);
  assert.equal(first.get('limit'), '2');
  assert.equal(first.get('offset'), '0');
  assert.equal(first.get('select'), 'id');
  assert.equal(second.get('offset'), '2');
  assert.equal(paged.calls[0].options.accessToken, 'test-token');

  for (const pageSize of [0, -1, 1.5, 1001, NaN]) {
    const invalid = load([]);
    await assert.rejects(
      invalid.getAllSupabaseRows('/rest/v1/items', { accessToken: 'test-token', pageSize }),
      /pageSize/,
    );
    assert.equal(invalid.calls.length, 0);
  }

  const malformed = load([{ data: [] }]);
  await assert.rejects(
    malformed.getAllSupabaseRows('/rest/v1/items', { accessToken: 'test-token' }),
    /không đúng định dạng/,
  );
  console.log('PASS core pagination: page boundaries, query replacement, invalid size and malformed response. Mock only.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
