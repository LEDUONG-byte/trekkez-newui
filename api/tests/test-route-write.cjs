// Contract/unit tests; intentionally NO LIVE DB WRITES.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const ts=require('typescript');
const file=fs.readFileSync(path.join(__dirname,'../services/route/route-write.ts'),'utf8');
const compiled=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
const sample={id:'old',creator_id:'owner',name:'Old',geometry:'0102000000...',distance_km:12,estimated_duration_min:100};
const route={id:'11111111-1111-4111-8111-111111111111',name:'Test',start:[106.1,10.1],destination:[106.2,10.2],stops:[[106.15,10.15]],geometry:[[106.1,10.1],[106.15,10.15],[106.2,10.2]],distanceMeters:2200,durationSeconds:900};
const create=(opts={})=>{
 const calls=[];
 const supabaseRequest=async (url,opt={})=>{
  calls.push({url,opt});
  if(url.startsWith('/rest/v1/routes?select=id,creator_id,name,geometry,distance_km,estimated_duration_min&limit=0')) {
   if(opts.noGeometry)throw new Error('column routes.geometry does not exist');
   return [];
  }
  if(url.startsWith('/rest/v1/waypoints?select=route_id,creator_id,name,type,latitude,longitude,order_index&limit=0')) {
   if(opts.noWaypointColumns)throw new Error('column waypoints.order_index does not exist');
   return [];
  }
  if(url.startsWith('/rest/v1/routes?select=id')&&opt.method==='POST')return [{id:route.id}];
  if(url.startsWith('/rest/v1/waypoints?select=')&&opt.method==='POST'){
   if(opts.rejectWaypoints)throw new Error('RLS denied');
   return opt.body.map(p=>({route_id:p.route_id,order_index:p.order_index}));
  }
  if(url.startsWith('/rest/v1/routes?id=')&&(!opt.method||opt.method==='GET'))return [{id:route.id}];
  if(opt.method==='DELETE')return null;
  throw new Error('Unexpected request: '+url);
 };
 const m={exports:{}};
 new Function('require','module','exports',compiled)((name)=>{
  if(name==='../auth/auth-session')return {getAuthSession:async()=>({accessToken:'test',userId:'owner'})};
  if(name==='../core/supabase-client')return {supabaseRequest};
  throw new Error('Unexpected import '+name);
 },m,m.exports);
 return {save:m.exports.saveRemoteRoute,calls};
};
(async()=>{
 const ok=create(); assert.equal(await ok.save(route),route.id);
 assert.equal(ok.calls.filter(c=>c.opt.method==='POST').length,2);
 const payload=ok.calls.find(c=>c.url.startsWith('/rest/v1/routes?select=id') && c.opt.method==='POST').opt.body[0];
 assert.equal(payload.geometry,'SRID=4326;LINESTRING(106.1 10.1,106.15 10.15,106.2 10.2)');
 assert.equal(payload.distance_km,2.2);
 const wp=ok.calls.find(c=>c.url.startsWith('/rest/v1/waypoints?select=') && c.opt.method==='POST').opt.body;
 assert.deepEqual(wp.map(p=>p.order_index),[0,1,2]);
 const mismatch=create({noGeometry:true});
 await assert.rejects(mismatch.save(route),/chưa khớp dữ liệu cần lưu/);
 assert.equal(mismatch.calls.filter(c=>c.opt.method==='POST').length,0);
 const noWaypointsSchema=create({noWaypointColumns:true});
 await assert.rejects(noWaypointsSchema.save(route),/chưa khớp dữ liệu cần lưu/);
 assert.equal(noWaypointsSchema.calls.filter(c=>c.opt.method==='POST').length,0);
 const denied=create({rejectWaypoints:true});
 await assert.rejects(denied.save(route),/Lưu Route\/Waypoint chưa hoàn tất/);
 assert.equal(denied.calls.filter(c=>c.opt.method==='DELETE').length,2);
 const invalid=create();
 await assert.rejects(invalid.save({...route,geometry:[[NaN,10],[106,11]]}),/chưa hợp lệ/);
 assert.equal(invalid.calls.length,0);
 console.log('PASS mocked Route write: zero-row schema preflight, PostGIS WKT, waypoints, confirmation, schema block, cleanup, invalid coords. No live writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
