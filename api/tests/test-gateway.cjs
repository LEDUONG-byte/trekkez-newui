// Unit-level New UI integration facade test; no network, tokens or React Native.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function compile(p, mockRequire) {
  const input = fs.readFileSync(path.join(__dirname, p), 'utf8');
  const out = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal((out.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const result = {};
  new Function('exports', 'require', out.outputText)(result, mockRequire);
  return result;
}
const map = compile('../integration/newui-mappers.ts', () => {throw new Error('Unexpected import');});
const team = { id: 't1', ownerId:'u1', name:'Hiking Team', description:'Walk', memberCount:2,
  mine:true, joined:true, allowMatchmaking:true, createdAt:'2026-10-21T00:00:00Z'};
const post = {id:'c1', authorId:'u2', author:'Member', title:'Trip', content:'Hello', image:'',
  tag:'Ảnh đẹp', likes:3, comments:2, liked:false, saved:false};
const services = {
  '../services/auth/auth-session': {getAuthSession: async()=>({userId:'u1', accessToken:'fake-not-sent'}),
    signInWithEmail:()=>{}, signInWithGoogleToken:()=>{}, clearAuthSession:()=>{}},
  '../services/account/account-supabase': {getProfileById:async()=>({full_name:'Demo', username:'demo',avatar_url:null})},
  '../services/activity/activity-profile': {getActivityProfileTotals:async()=>({totalActivities:2,totalDistanceMeters:12500,totalMovingSeconds:3660,totalElevationGainMeters:400})},
  '../services/team/team-supabase': {getRemoteTeams:async()=>[team]},
  '../services/community/community-supabase': {getRemoteCommunityPosts:async()=>[post]},
  '../services/plan/plan-team-supabase': {getRemotePlans:async()=>[{
    id:'p1',title:'Mountain',ownerId:'u1',notes:'',startAt:'22/10/2026 07:00',createdAt:'2026-10-20T00:00:00Z'}]},
  '../services/route/route-read': {getRemoteRouteSummaries:async()=>[{
    id:'r1',title:'Trail',mine:true,details:'',startDate:'',createdAt:''}]},
  '../services/plan/plan-item-catalog': {getPlanItemCategories:async()=>[{id:'food',name:'FOOD',items:[]}]},
  '../services/community/social-supabase': {getUserFollowConnections:async()=>[{userId:'u2'}]},
  './newui-mappers': map,
};
const gateway = compile('../integration/newui-gateway.ts', name=>{
  if (!services[name]) throw new Error('Unexpected dependency: '+name);
  return services[name];
});
(async()=>{
  assert.equal((await gateway.loadTeamCards())[0].name,'Hiking Team');
  assert.equal((await gateway.loadPlanCards())[0].startDate,'2026-10-22');
  assert.equal((await gateway.loadRouteCards())[0].title,'Trail');
  assert.equal((await gateway.loadExploreFeed()).length,2);
  assert.equal((await gateway.loadFollowingPosts()).length,1);
  const options=await gateway.loadPlanWizardOptions();
  assert.equal(options.teams[0].id,'t1');
  assert.equal(options.categories[0].name,'FOOD');
  const profile=await gateway.loadProfileOverview();
  assert.equal(profile.totalDistanceKm,12.5);
  assert.equal(profile.movingTimeFormatted,'1h 1m');
  assert.equal(profile.currentStreak,null);
  console.log('PASS: New UI gateway (Home, Team, Plan, Route, Profile)');
})().catch(e=>{console.error(e); process.exitCode=1;});
