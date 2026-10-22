import { getAuthSession } from '../auth/auth-session';
import { getAllSupabaseRows } from '../core/supabase-client';

/**
 * Read-only Route adapter. Only `id` and `creator_id` are confirmed by the
 * backend smoke test. Optional display fields are handled defensively.
 * No cloud Route writes are attempted because route geometry/storage contract
 * has not been verified and the new UI has no Save Route handler yet.
 */
export type RouteSummary = {
  id: string;
  ownerId: string;
  title: string;
  details: string;
  createdAt: string;
  startDate: string;
  mine: boolean;
};

type RouteRow = Record<string, unknown> & {
  id: string;
  creator_id: string;
};

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function dateOnly(value: unknown): string {
  const text = textValue(value);
  if (!text) return '';
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
}

export function mapRemoteRoute(row: RouteRow, userId: string): RouteSummary {
  const routeName = textValue(row.name) || textValue(row.title) || textValue(row.route_name);
  return {
    id: row.id,
    ownerId: row.creator_id,
    title: routeName || `Route ${row.id.slice(0, 8)}`,
    details: textValue(row.description) || textValue(row.note),
    createdAt: dateOnly(row.created_at),
    startDate: dateOnly(row.start_at) || dateOnly(row.trip_date),
    mine: row.creator_id === userId,
  };
}

export async function getRemoteRouteSummaries(expectedUserId?: string): Promise<RouteSummary[]> {
  const session = await getAuthSession();
  if (!session?.accessToken || !session.userId) {
    throw new Error('Bạn cần đăng nhập để xem tuyến đường.');
  }
  if (expectedUserId && session.userId !== expectedUserId) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }
  const rows = await getAllSupabaseRows<RouteRow>(
    `/rest/v1/routes?creator_id=eq.${encodeURIComponent(session.userId)}&select=*&order=id.asc`,
    { accessToken: session.accessToken, expectedUserId: session.userId },
  );
  return rows.map((row) => mapRemoteRoute(row, session.userId as string));
}
