const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../services/team/team-supabase.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load({ ignorePatch = false } = {}) {
  const calls = [];
  const reads = [];
  let row = null;
  const auth = async () => ({ userId: 'user-1', accessToken: 'token' });
  const supabaseRequest = async (url, request = {}) => {
    calls.push({ url, request });
    if (request.method === 'POST' && url.startsWith('/rest/v1/teams?on_conflict=id')) {
      row = {
        ...request.body[0],
        created_at: '2026-10-23T00:00:00Z',
        updated_at: '2026-10-23T00:00:00Z',
      };
      return null;
    }
    if (request.method === 'PATCH' && url.startsWith('/rest/v1/teams?id=')) {
      if (!ignorePatch && row?.owner_id === 'user-1') Object.assign(row, request.body);
      return null;
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const getAllSupabaseRows = async (url, request = {}) => {
    reads.push({ url, request });
    if (url.startsWith('/rest/v1/teams?id=')) {
      return row ? [{ ...row }] : [];
    }
    if (url.startsWith('/rest/v1/team_members?')) return [];
    throw new Error(`Unexpected read: ${url}`);
  };
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === '../auth/auth-session') return { getAuthSession: auth };
    if (name === '../core/supabase-client') return { getAllSupabaseRows, supabaseRequest };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('require', 'module', 'exports', compiled)(requireMock, module, module.exports);
  return { ...module.exports, calls, reads };
}

(async () => {
  const api = load();
  const input = {
    id: 'team-1',
    name: 'Weekend hikers',
    description: 'A real team',
    maxMembers: 8,
    allowMatchmaking: false,
    level: 'All',
    location: 'Da Lat',
    routeName: '',
    tripDate: '',
    meetingPoint: '',
    note: '',
  };
  await api.uploadTeam(input);
  assert.equal(api.calls[0].request.body[0].max_members, 8);
  assert.equal(api.calls[0].request.body[0].allow_matchmaking, false);

  const team = await api.getRemoteTeam(input.id);
  assert.equal(team?.name, input.name);
  assert.equal(team?.maxMembers, input.maxMembers);
  await api.updateRemoteTeamDetails(input.id, {
    name: 'Updated hikers',
    description: 'Updated description',
    maxMembers: 12,
    allowMatchmaking: true,
  });
  assert.equal(api.calls.at(-1).request.body.max_members, 12);
  assert.equal(api.reads.at(-1).request.expectedUserId, 'user-1');

  const denied = load({ ignorePatch: true });
  await denied.uploadTeam(input);
  await assert.rejects(
    denied.updateRemoteTeamDetails(input.id, {
      name: 'Updated hikers',
      description: 'Updated description',
      maxMembers: 12,
      allowMatchmaking: true,
    }),
    /chưa xác nhận các thay đổi Team/,
  );
  console.log('PASS Team create/update: capacity and discoverability writes, ownership scope and read-back confirmation. Mock only.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
