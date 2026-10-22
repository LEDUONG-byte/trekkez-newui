const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function compile(file, deps) {
  const input = fs.readFileSync(path.join(root, file), 'utf8');
  const out = ts.transpileModule(input, {fileName:file, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const module = {exports:{}};
  const localRequire=name=>{
    if(!(name in deps)) throw Error('Unexpected import '+name);
    return deps[name];
  };
  new Function('module','exports','require',out.outputText)(module,module.exports,localRequire);
  return module.exports;
}
async function main(){
  const auth={getAuthSession:async()=>({accessToken:'sample-token',userId:'u1'})};
  const row={id:'p1',route_id:'r1',owner_id:'u1',team_id:null,mode:'personal',title:'Test plan',created_at:'2026-10-22T00:00:00Z',start_at:'2026-10-22T00:00:00Z',expected_return_at:'2026-10-23T00:00:00Z',difficulty:'moderate',required_items:[]};
  const plan={id:'p1',routeId:'r1',mode:'personal',title:'Test plan',startAt:'22/10/2026 07:00',expectedReturnAt:'23/10/2026 07:00',ownerId:'u1'};
  const date={parsePlanDateTime:()=>new Date('2026-10-22T00:00:00.000Z'),formatPlanDateTime:()=> '22/10/2026 07:00'};
  const withApi=(api)=>compile('api/services/plan/plan-team-supabase.ts',{
    '../auth/auth-session':auth,
    '../core/supabase-client':api,
    './trip-time':date
  });
  let api=withApi({supabaseRequest:async()=>[row],getAllSupabaseRows:async()=>[]});
  assert.equal((await api.createRemotePlan(plan)).id,'p1');
  api=withApi({supabaseRequest:async()=>{throw Error('policy denied')},getAllSupabaseRows:async()=>[]});
  await assert.rejects(api.createRemotePlan(plan),/Không thể lưu Plan lên Supabase.*policy denied/);
  api=withApi({supabaseRequest:async()=>[],getAllSupabaseRows:async()=>[]});
  await assert.rejects(api.createRemotePlan(plan),/chưa xác nhận đã lưu Plan/);
  api=withApi({supabaseRequest:async()=>[],getAllSupabaseRows:async (p)=>{if(p.includes('team_plan_item_status')) throw Error('status error');return [row]}});
  assert.equal((await api.getRemotePlans()).length,1);
  const emptyTeam={getRemoteTeams:async()=>{throw Error('team offline')}};
  const mockDeps={
    '../services/auth/auth-session': {...auth, signInWithEmail(){},signInWithGoogleToken(){},clearAuthSession(){}},
    '../services/account/account-supabase': {getProfileById:async()=>null},
    '../services/activity/activity-profile': {getActivityProfileTotals:async()=>({totalMovingSeconds:0,totalDistanceMeters:0,totalElevationGainMeters:0,totalActivities:0})},
    '../services/team/team-supabase':emptyTeam,
    '../services/community/community-supabase':{getRemoteCommunityPosts:async()=>[]},
    '../services/plan/plan-team-supabase':{getRemotePlans:async()=>[]},
    '../services/route/route-read':{getRemoteRouteSummaries:async()=>[{id:'r1'}]},
    '../services/plan/plan-item-catalog':{getPlanItemCategories:async()=>[]},
    '../services/community/social-supabase':{getUserFollowConnections:async()=>[]},
    '../services/core/supabase-client':{getAllSupabaseRows:async()=>[]},
    './newui-mappers':{routeToCard:r=>r,planToCard:p=>p,teamToCard:t=>t,postToHomeCard:p=>p,teamToHomeCard:t=>t}
  };
  const gw=compile('api/integration/newui-gateway.ts',mockDeps);
  const opts=await gw.loadPlanWizardOptions();
  assert.equal(opts.routes.length,1);
  assert.equal(opts.teams.length,0);
  assert.match(opts.warnings[0],/team offline/);
  console.log('PASS: Plan save response/denied/empty-response/list-recovery/partial wizard loads (mocked, no remote Supabase)');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
