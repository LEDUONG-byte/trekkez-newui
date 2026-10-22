import { getAuthSession } from '../auth/auth-session';
import { supabaseRequest } from '../core/supabase-client';
import type { Coordinate } from '../../types/route';

type Row = Record<string, unknown>;
export type NewRoute = {
  id: string;
  name: string;
  start: Coordinate;
  destination: Coordinate;
  stops: Coordinate[];
  geometry: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
};
const coordOk = (v: unknown): v is Coordinate => Array.isArray(v) && v.length === 2 &&
  typeof v[0] === 'number' && Number.isFinite(v[0]) && Math.abs(v[0]) <= 180 &&
  typeof v[1] === 'number' && Number.isFinite(v[1]) && Math.abs(v[1]) <= 90;

/**
 * Write only when the live routes table has the known PostGIS columns.
 * This mirrors the earlier route design, but the user's live SQL audit is
 * still required to independently confirm types, RLS and NOT NULL columns.
 */
export async function saveRemoteRoute(route: NewRoute): Promise<string> {
  const session = await getAuthSession();
  if (!session?.accessToken || !session.userId) throw new Error('Bạn cần đăng nhập để lưu Route.');
  if (!route.name.trim() || route.geometry.length < 2 || !route.geometry.every(coordOk) ||
      !coordOk(route.start) || !coordOk(route.destination) || !route.stops.every(coordOk))
    throw new Error('Dữ liệu Route chưa hợp lệ.');
  if (!Number.isFinite(route.distanceMeters) || !Number.isFinite(route.durationSeconds))
    throw new Error('Quãng đường hoặc thời gian Route không hợp lệ.');
  const auth = {accessToken: session.accessToken, expectedUserId:session.userId};
  const fetched = await supabaseRequest('/rest/v1/routes?select=*&limit=1', auth);
  const sample = Array.isArray(fetched) ? fetched[0] as Row | undefined : undefined;
  if (!sample) throw new Error('Không lấy được mẫu cấu trúc routes. Hãy chạy sql/02_ROUTE_CONTRACT.sql trước khi ghi.');
  const keys = new Set(Object.keys(sample));
  const required = ['id','creator_id','name','geometry','distance_km','estimated_duration_min'];
  if (!required.every(k => keys.has(k))) throw new Error('Routes hiện tại không khớp hợp đồng PostGIS đã biết. Không ghi để tránh dữ liệu sai; cần kết quả SQL contract.');
  const lineString = `SRID=4326;LINESTRING(${route.geometry.map(pt => `${pt[0]} ${pt[1]}`).join(',')})`;
  const routeBody: Row = {
    id:route.id,creator_id:session.userId,name:route.name.trim(),
    geometry:lineString,distance_km:Math.max(0,route.distanceMeters)/1000,
    estimated_duration_min:Math.max(0,Math.ceil(route.durationSeconds/60)),
  };
  const points = [route.start,...route.stops,route.destination];
  const waypointRows = points.map((coord, i) => ({
    route_id:route.id, creator_id:session.userId,
    name:i===0?'A':i===points.length-1?'B':`Waypoint ${i}`,
    type:'checkpoint',latitude:coord[1],longitude:coord[0],order_index:i,
  }));
  let wroteRoute = false;
  try {
    const insert = await supabaseRequest('/rest/v1/routes?select=id',{
      ...auth,method:'POST',headers:{Prefer:'return=representation'},body:[routeBody],
    });
    wroteRoute=true;
    if (!Array.isArray(insert) || !insert.some((r:Row)=>r.id===route.id))
      throw new Error('Supabase chưa xác nhận đã lưu hàng routes.');
    const waypoints = await supabaseRequest('/rest/v1/waypoints?select=route_id,order_index',{
      ...auth,method:'POST',headers:{Prefer:'return=representation'},body:waypointRows,
    });
    if (!Array.isArray(waypoints) || waypoints.length !== waypointRows.length)
      throw new Error('Supabase chưa xác nhận đủ waypoint.');
    const checked = await supabaseRequest(
      `/rest/v1/routes?id=eq.${encodeURIComponent(route.id)}&creator_id=eq.${encodeURIComponent(session.userId)}&select=id`,auth);
    if (!Array.isArray(checked) || !checked.some((r:Row)=>r.id===route.id))
      throw new Error('Supabase chưa xác nhận Route khi đọc lại.');
    return route.id;
  } catch(error) {
    if (wroteRoute) {
      // Best-effort cleanup: not a transaction; surface cleanup errors explicitly.
      const problems: string[]=[];
      try { await supabaseRequest(`/rest/v1/waypoints?route_id=eq.${encodeURIComponent(route.id)}`,
        {...auth,method:'DELETE',headers:{Prefer:'return=minimal'}}); }
      catch(e){problems.push(`waypoints cleanup: ${e instanceof Error?e.message:String(e)}`);}
      try { await supabaseRequest(`/rest/v1/routes?id=eq.${encodeURIComponent(route.id)}&creator_id=eq.${encodeURIComponent(session.userId)}`,
        {...auth,method:'DELETE',headers:{Prefer:'return=minimal'}}); }
      catch(e){problems.push(`routes cleanup: ${e instanceof Error?e.message:String(e)}`);}
      const details=problems.length?` Cần kiểm tra thủ công Route ID ${route.id}: ${problems.join(' | ')}`:'';
      throw new Error(`Lưu Route/Waypoint chưa hoàn tất: ${error instanceof Error?error.message:String(error)}.${details}`);
    }
    throw new Error(`Supabase không lưu được Route: ${error instanceof Error?error.message:String(error)}`);
  }
}
