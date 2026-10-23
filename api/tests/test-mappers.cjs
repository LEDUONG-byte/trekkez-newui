// No network, no Expo runtime, no Supabase credentials. Run: node api/tests/test-mappers.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript'); // already included in New UI devDependencies
const source = fs.readFileSync(path.join(__dirname, '../integration/newui-mappers.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const moduleExports = {};
new Function('exports', 'require', compiled.outputText)(moduleExports, () => { throw new Error('Unexpected runtime import'); });

const team = {
  id:'t1', ownerId:'u1', name:'Test Team', description:'Outdoor', memberCount:3,
  mine:true, joined:true, createdAt:'2026-10-22T12:00:00Z', allowMatchmaking:true,
  imageUrl:'https://example.test/team.png',
};
assert.deepEqual(moduleExports.teamToCard(team), {
  id:'t1', name:'Test Team', isOwnedByYou:true, imageUrl:'https://example.test/team.png',
  color:'#BAE6FD', membersCount:3,
  description:'Outdoor', createdAt:'2026-10-22', isJoined:true, allowMatchmaking:true,
});
const plan = {
  id:'p1', title:'Climb', ownerId:'u1', notes:'Meet at 7',
  startAt:'22/10/2026 07:00', createdAt:'2026-10-15T08:00:00Z',
};
assert.equal(moduleExports.planToCard(plan,'u1').startDate, '2026-10-22');
assert.equal(moduleExports.planToCard(plan,'u2').isOwnedByYou, false);
const post = {id:'c1',author:'Person',avatarUrl:'https://example.test/avatar.jpg',
  image:'https://example.test/p.jpg', tag:'Ảnh đẹp',
  content:'Nice', title:'Sunset', likes:2, comments:1, liked:true, saved:false};
assert.deepEqual(moduleExports.postToHomeCard(post).images, ['https://example.test/p.jpg']);
assert.equal(moduleExports.postToHomeCard(post).avatar, 'https://example.test/avatar.jpg');
assert.equal(moduleExports.postToHomeCard(post).isLiked, true);
assert.equal(moduleExports.teamToHomeCard(team).itemType, 'TEAM');
const interleaved = moduleExports.interleaveHomeFeed(
  [
    {itemType:'POST',id:'p1',feedTimestamp:'2026-10-22T10:00:00Z'},
    {itemType:'POST',id:'p2',feedTimestamp:'2026-10-22T08:00:00Z'},
    {itemType:'POST',id:'p3',feedTimestamp:'2026-10-22T06:00:00Z'},
  ],
  [
    {itemType:'TEAM',id:'t1',feedTimestamp:'2026-10-22T09:00:00Z'},
    {itemType:'TEAM',id:'t2',feedTimestamp:'2026-10-22T07:00:00Z'},
  ],
);
assert.deepEqual(interleaved.map(card=>card.id), ['p1','t1','p2','t2','p3']);
const teamFirst = moduleExports.interleaveHomeFeed(
  [{itemType:'POST',id:'p1',feedTimestamp:'2026-10-22T08:00:00Z'}],
  [{itemType:'TEAM',id:'t1',feedTimestamp:'2026-10-22T09:00:00Z'}],
);
assert.deepEqual(teamFirst.map(card=>card.itemType), ['TEAM','POST']);
assert.equal(moduleExports.routeToCard({id:'r1',title:'Route 1',mine:true,details:'',startDate:'',createdAt:''}).id, 'r1');
console.log('PASS: New UI mappers (team, plan, route, community)');
