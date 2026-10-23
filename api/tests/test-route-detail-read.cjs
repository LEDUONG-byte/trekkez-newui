'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let ts; try { ts = require('typescript'); } catch { console.error('Install npm dependencies before running this test.'); process.exit(2); }
const source=fs.readFileSync(path.join(__dirname,'../services/route/route-detail.ts'),'utf8');
const js=ts.transpileModule(source,{fileName:'route-detail.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let routes=[];let wps=[];
const requireMock=(m)=> m.endsWith('auth/auth-session')?{getAuthSession:async()=>({accessToken:'mocktoken',userId:'u1'})}:
    m.endsWith('core/supabase-client')?{getAllSupabaseRows:async url=>url.includes('/waypoints?')?wps:routes}:
    (()=>{throw Error(m)})();
const mod={exports:{}};
new Function('module','exports','require',js)(mod,mod.exports,requireMock);
const {mapRouteDetail,parseRouteGeometry,getRemoteRouteDetail}=mod.exports;
assert.deepEqual(parseRouteGeometry('SRID=4326;LINESTRING(106.6 10.1,106.7 10.2)'),[[106.6,10.1],[106.7,10.2]]);
assert.deepEqual(parseRouteGeometry({type:'LineString', coordinates:[[106.6,10.1],[106.7,10.2]]}),[[106.6,10.1],[106.7,10.2]]);
assert.deepEqual(parseRouteGeometry('0102000020E6100000'),[]);
const output=mapRouteDetail({id:'route-1',name:'Route thật',geometry:null,distance_km:2.4},[
 {id:'b',name:'B',order_index:1,longitude:106.7,latitude:10.2},
 {id:'a',name:'A',order_index:0,longitude:106.6,latitude:10.1},
]);
assert.equal(output.name,'Route thật');assert.equal(output.points[0].label,'A');
assert.deepEqual(output.geometry,[[106.6,10.1],[106.7,10.2]]);
(async()=>{
 routes=[{id:'route-1',name:'Live route mock',geometry:null}];
 wps=[{id:'a',order_index:0,name:'A',latitude:10.1,longitude:106.6}];
 const remote=await getRemoteRouteDetail('route-1');
 assert.equal(remote.name,'Live route mock');assert.equal(remote.points.length,1);
 console.log('PASS Route read mapping, PostGIS string/GeoJSON, waypoint order, mocked Supabase fetch. No live writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
