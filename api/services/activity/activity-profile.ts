import { getAuthSession } from '../auth/auth-session';
import { getAllSupabaseRows } from '../core/supabase-client';
import type {
  ActivityProfileTotals,
  ActivitySessionSummary,
} from '../../types/activity';

/** New UI Profile shows totals, but has no Activity GPS recording screen. */
type ActivitySessionRow = {
  id: string;
  route_id: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain_meters: number;
};

export async function getActivityProfileSessions(
  expectedUserId?: string,
): Promise<ActivitySessionSummary[]> {
  const auth = await getAuthSession();
  if (!auth?.accessToken || !auth.userId) {
    throw new Error('Cần đăng nhập để xem thống kê hoạt động.');
  }
  if (expectedUserId && auth.userId !== expectedUserId) {
    throw new Error('Phiên đăng nhập không đúng người dùng.');
  }

  const columns = [
    'id', 'route_id', 'started_at', 'ended_at',
    'duration_seconds', 'distance_meters', 'elevation_gain_meters',
  ].join(',');
  const rows = await getAllSupabaseRows<ActivitySessionRow>(
    `/rest/v1/activity_sessions?user_id=eq.${encodeURIComponent(auth.userId)}` +
      `&select=${columns}&order=started_at.desc`,
    { accessToken: auth.accessToken, expectedUserId: auth.userId },
  );

  return rows.map((row) => ({
    id: row.id,
    routeId: row.route_id ?? null,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: Number(row.duration_seconds) || 0,
    distanceMeters: Number(row.distance_meters) || 0,
    elevationGainMeters: Number(row.elevation_gain_meters) || 0,
  }));
}

/** This makes no writes. Streak and completed-route rules need product clarification. */
export async function getActivityProfileTotals(
  expectedUserId?: string,
): Promise<ActivityProfileTotals> {
  const sessions = await getActivityProfileSessions(expectedUserId);
  return sessions.reduce<ActivityProfileTotals>((totals, session) => ({
    totalActivities: totals.totalActivities + 1,
    totalDistanceMeters: totals.totalDistanceMeters + session.distanceMeters,
    totalMovingSeconds: totals.totalMovingSeconds + session.durationSeconds,
    totalElevationGainMeters: totals.totalElevationGainMeters + session.elevationGainMeters,
  }), {
    totalActivities: 0,
    totalDistanceMeters: 0,
    totalMovingSeconds: 0,
    totalElevationGainMeters: 0,
  });
}

export async function getPublicActivityProfileTotals(
  profileUserId: string,
): Promise<ActivityProfileTotals> {
  if (!profileUserId) {
    throw new Error('Thiếu ID người dùng cần xem thống kê.');
  }
  const auth = await getAuthSession();
  if (!auth?.accessToken || !auth.userId) {
    throw new Error('Cần đăng nhập để xem thống kê hoạt động.');
  }
  const columns = [
    'id', 'route_id', 'started_at', 'ended_at',
    'duration_seconds', 'distance_meters', 'elevation_gain_meters',
  ].join(',');
  const rows = await getAllSupabaseRows<ActivitySessionRow>(
    `/rest/v1/activity_sessions?user_id=eq.${encodeURIComponent(profileUserId)}` +
      `&select=${columns}&order=started_at.desc`,
    { accessToken: auth.accessToken, expectedUserId: auth.userId },
  );
  return rows.reduce<ActivityProfileTotals>((totals, row) => ({
    totalActivities: totals.totalActivities + 1,
    totalDistanceMeters: totals.totalDistanceMeters + (Number(row.distance_meters) || 0),
    totalMovingSeconds: totals.totalMovingSeconds + (Number(row.duration_seconds) || 0),
    totalElevationGainMeters: totals.totalElevationGainMeters + (Number(row.elevation_gain_meters) || 0),
  }), {
    totalActivities: 0,
    totalDistanceMeters: 0,
    totalMovingSeconds: 0,
    totalElevationGainMeters: 0,
  });
}
