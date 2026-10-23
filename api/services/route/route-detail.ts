import { getAuthSession } from '../auth/auth-session';
import { getAllSupabaseRows } from '../core/supabase-client';

export type LngLat = [number, number];
export type RoutePoint = { id: string; label: string; coordinate: LngLat };
export type RemoteRouteDetail = {
  id: string; name: string; description: string;
  distanceKm: number | null; durationMinutes: number | null;
  geometry: LngLat[]; points: RoutePoint[];
  waypointError: string | null;
};
const valid = (v: unknown): v is LngLat => Array.isArray(v) && v.length >= 2 &&
  typeof v[0] === 'number' && Number.isFinite(v[0]) && Math.abs(v[0]) <= 180 &&
  typeof v[1] === 'number' && Number.isFinite(v[1]) && Math.abs(v[1]) <= 90;

export function parseRouteGeometry(source: unknown): LngLat[] {
  if (source && typeof source === 'object') {
    const obj = source as { type?: string; coordinates?: unknown; geometry?: unknown };
    if (obj.geometry) return parseRouteGeometry(obj.geometry);
    if (obj.type === 'LineString' && Array.isArray(obj.coordinates))
      return obj.coordinates.filter(valid).map(c => [c[0], c[1]]);
  }
  if (typeof source !== 'string' || !source.trim()) return [];
  if (source.trim().startsWith('{')) {
    try { return parseRouteGeometry(JSON.parse(source)); } catch { return []; }
  }
  const match = /^(?:SRID=\d+;)?LINESTRING\s*\((.+)\)$/i.exec(source.trim());
  if (!match) return []; // PostGIS EWKB hex needs server-side GeoJSON conversion; never guess coordinates.
  return match[1].split(',').map(p => p.trim().split(/\s+/).map(Number)).filter(valid).map(p => [p[0], p[1]]);
}

function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function label(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

export function mapRouteDetail(row: Record<string, unknown>, waypoints: Record<string, unknown>[], waypointError: string | null = null): RemoteRouteDetail {
  const sorted = [...waypoints].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
  const points = sorted.map((p, i) => ({
    id: String(p.id ?? `point-${i}`),
    label: label(p.name, i === 0 ? 'A' : i === sorted.length - 1 ? 'B' : String(i)),
    coordinate: [Number(p.longitude), Number(p.latitude)] as LngLat,
  })).filter(p => valid(p.coordinate));
  const geometry = parseRouteGeometry(row.geometry);
  return {
    id: String(row.id ?? ''),
    name: label(row.name, label(row.title, 'Route')),
    description: label(row.description, label(row.note, 'Chưa có mô tả.')),
    distanceKm: numberOrNull(row.distance_km),
    durationMinutes: numberOrNull(row.estimated_duration_min),
    points,
    geometry: geometry.length > 1 ? geometry : points.map(p => p.coordinate),
    waypointError,
  };
}

/** Read-only Route detail; no writes, no mock routes, no database migrations. */
export async function getRemoteRouteDetail(id: string): Promise<RemoteRouteDetail> {
  if (!id || !/^[\w-]+$/.test(id)) throw new Error('Mã Route không hợp lệ.');
  const session = await getAuthSession();
  if (!session?.accessToken || !session.userId) throw new Error('Bạn cần đăng nhập để xem Route.');
  const auth = { accessToken: session.accessToken, expectedUserId: session.userId };
  const rows = await getAllSupabaseRows<Record<string, unknown>>(
    `/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=*`, auth,
  );
  if (!rows.length) throw new Error('Không tìm thấy Route hoặc bạn chưa có quyền xem.');
  let points: Record<string, unknown>[] = [];
  let error: string | null = null;
  try {
    points = await getAllSupabaseRows<Record<string, unknown>>(
      `/rest/v1/waypoints?route_id=eq.${encodeURIComponent(id)}&select=*&order=order_index.asc`, auth,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return mapRouteDetail(rows[0], points, error);
}
