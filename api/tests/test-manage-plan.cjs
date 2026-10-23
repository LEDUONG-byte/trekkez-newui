// Pure-view-model tests. No database writes and no UI redesign.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../integration/manage-plan-adapter.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod = {exports:{}};
new Function('module','exports','require',compiled)(mod,mod.exports,require);
const map = mod.exports.toPlanManageDetails;
const plan = {id:'plan-1',routeId:'route-1',title:'Kế hoạch thật',startAt:'25/10/2026 08:00',expectedReturnAt:'25/10/2026 17:00',notes:'Mang theo nước',difficulty:'moderate'};
const result = map(plan,{id:'route-1',title:'Đường thật',details:'Tuyến A-B'},{id:'team-1',name:'Đội thật'},[{userId:'uuid1',displayName:'Bạn A',avatarUrl:''}]);
assert.equal(result.name,'Kế hoạch thật');
assert.equal(result.route.name,'Đường thật');
assert.equal(result.team.name,'Kế hoạch cá nhân'); // no teamId => must not inject foreign team
assert.equal(result.team.members.length,0);
assert.equal(result.difficulty,'MODERATE');
assert.equal(result.noteContent,'Mang theo nước');
const teamPlan = map({...plan,teamId:'team-1',difficulty:undefined},null,{id:'team-1',name:'Đội thật'},[{userId:'uuid1',displayName:'Bạn A',avatarUrl:''}]);
assert.equal(teamPlan.difficulty,'UNSPECIFIED');
assert.equal(teamPlan.team.members[0].name,'Bạn A');
assert.equal(teamPlan.route.name,'Route route-1');
assert(!JSON.stringify(teamPlan).includes('Sixseven'));
console.log('PASS Manage Plan mapper: real content, no mock, personal/team separation, null fallbacks.');
