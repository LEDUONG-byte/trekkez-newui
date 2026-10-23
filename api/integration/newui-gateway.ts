/**
 * One integration boundary for New UI owners. All frontend files remain intact.
 * Call functions from existing screen effects/event handlers during integration;
 * importing the package alone does not change React component state.
 */
import { getAuthSession, signInWithEmail, signInWithGoogleToken, clearAuthSession } from '../services/auth/auth-session';
import { getProfileById } from '../services/account/account-supabase';
import { getActivityProfileTotals } from '../services/activity/activity-profile';
import { getRemoteTeams } from '../services/team/team-supabase';
import { getRemoteCommunityPosts } from '../services/community/community-supabase';
import { getRemotePlans } from '../services/plan/plan-team-supabase';
import { getRemoteRouteSummaries } from '../services/route/route-read';
import { getPlanItemCategories } from '../services/plan/plan-item-catalog';
import { getAllSupabaseRows } from '../services/core/supabase-client';
import {
  teamToCard, planToCard, routeToCard, postToHomeCard, teamToHomeCard,
  type HomeCard, type PlanCard, type TeamCard,
} from './newui-mappers';

async function requireViewer() {
  const session = await getAuthSession();
  if (!session?.userId || !session.accessToken) {
    throw new Error('Vui lòng đăng nhập để tải dữ liệu TrekkEZ.');
  }
  return { userId: session.userId, token: session.accessToken };
}

export type FindableTeamPlan = {
  id: string;
  planName: string;
  teamId: string;
  teamName: string;
  difficulty: string;
  membersCount: number;
  maxMembers: number;
  startDate: string;
  startCoordinate: [number, number];
  avatarUrl: string | null;
  isOwnedByYou: boolean;
  isJoined: boolean;
};

function isValidLngLat(longitude: unknown, latitude: unknown): boolean {
  return typeof longitude === 'number' && Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180 && typeof latitude === 'number' &&
    Number.isFinite(latitude) && Math.abs(latitude) <= 90;
}

export async function loadFindableTeamPlans(): Promise<FindableTeamPlan[]> {
  const viewer = await requireViewer();
  const [teams, plans] = await Promise.all([
    getRemoteTeams(viewer.userId),
    getRemotePlans(viewer.userId),
  ]);
  const discoverableTeams = new Map(
    teams
      .filter((team) => team.allowMatchmaking !== false)
      .map((team) => [team.id, team]),
  );
  const candidatePlans = plans.filter(
    (plan) => plan.mode === 'team' && Boolean(plan.teamId && plan.routeId) && discoverableTeams.has(plan.teamId!),
  );
  const routeIds = [...new Set(candidatePlans.map((plan) => plan.routeId))];
  if (routeIds.length === 0) return [];

  const waypoints = await getAllSupabaseRows<{
    route_id: string;
    latitude: number | string | null;
    longitude: number | string | null;
    order_index: number | null;
  }>(
    `/rest/v1/waypoints?route_id=in.(${routeIds.map(encodeURIComponent).join(',')})&select=route_id,latitude,longitude,order_index&order=order_index.asc`,
    { accessToken: viewer.token, expectedUserId: viewer.userId },
  );
  const firstWaypointByRoute = new Map<string, [number, number]>();
  for (const point of waypoints) {
    if (firstWaypointByRoute.has(point.route_id)) continue;
    if (point.longitude === null || point.latitude === null) continue;
    const longitude = Number(point.longitude);
    const latitude = Number(point.latitude);
    if (isValidLngLat(longitude, latitude)) {
      firstWaypointByRoute.set(point.route_id, [longitude, latitude]);
    }
  }

  return candidatePlans.flatMap((plan) => {
    const team = plan.teamId ? discoverableTeams.get(plan.teamId) : undefined;
    const startCoordinate = firstWaypointByRoute.get(plan.routeId);
    if (!team || !startCoordinate) return [];
    return [{
      id: plan.id,
      planName: plan.title,
      teamId: team.id,
      teamName: team.name,
      difficulty: plan.difficulty || 'moderate',
      membersCount: team.memberCount,
      maxMembers: team.maxMembers ?? 20,
      startDate: plan.startAt,
      startCoordinate,
      avatarUrl: team.imageUrl || null,
      isOwnedByYou: team.mine,
      isJoined: team.joined || team.mine,
    }];
  });
}

export async function getCurrentViewerId(): Promise<string> {
  const viewer = await requireViewer();
  return viewer.userId;
}

export const newUiAuth = {
  signInWithEmail,
  signInWithGoogleToken,
  getAuthSession,
  signOut: clearAuthSession,
};

export async function loadTeamCards(): Promise<TeamCard[]> {
  await requireViewer();
  const teams = await getRemoteTeams();
  return teams.map(teamToCard);
}

export async function loadPlanCards(): Promise<PlanCard[]> {
  const viewer = await requireViewer();
  const plans = await getRemotePlans(viewer.userId);
  return plans.map((plan) => planToCard(plan, viewer.userId));
}

export async function loadRouteCards(): Promise<PlanCard[]> {
  const viewer = await requireViewer();
  const routes = await getRemoteRouteSummaries(viewer.userId);
  return routes.map(routeToCard);
}

/** Existing UI has no cloud route-save event; read/list only until schema is verified. */
export async function loadPlanWizardOptions() {
  await requireViewer();
  // Do not discard real Routes when a secondary Team or catalog request fails.
  const [routeResult, teamResult, categoryResult] = await Promise.allSettled([
    loadRouteCards(),
    getRemoteTeams(),
    getPlanItemCategories(),
  ]);
  if (routeResult.status === 'rejected') {
    const message = routeResult.reason instanceof Error ? routeResult.reason.message : String(routeResult.reason);
    throw new Error(`Không tải được Route từ Supabase: ${message}`);
  }
  const warnings: string[] = [];
  if (teamResult.status === 'rejected') {
    const message = teamResult.reason instanceof Error ? teamResult.reason.message : String(teamResult.reason);
    warnings.push(`Không tải được Team: ${message}`);
  }
  if (categoryResult.status === 'rejected') {
    const message = categoryResult.reason instanceof Error ? categoryResult.reason.message : String(categoryResult.reason);
    warnings.push(`Không tải được danh mục vật dụng: ${message}`);
  }
  const teams = teamResult.status === 'fulfilled' ? teamResult.value : [];
  return {
    routes: routeResult.value,
    teams: teams.filter((team) => team.mine || team.joined).map((team) => ({ id: team.id, name: team.name })),
    categories: categoryResult.status === 'fulfilled' ? categoryResult.value : [],
    warnings,
  };
}

/** Explore contains post cards and team cards; no invented follows or avatars. */
export async function loadExploreFeed(): Promise<HomeCard[]> {
  await requireViewer();
  const [posts, teams] = await Promise.all([getRemoteCommunityPosts(), getRemoteTeams()]);
  return [...posts.map(postToHomeCard), ...teams.filter((team) => team.allowMatchmaking).map(teamToHomeCard)];
}

/** Authoritative following IDs for the logged-in viewer; never inferred from post IDs. */
export async function loadFollowingAuthorIds(): Promise<Set<string>> {
  const viewer = await requireViewer();
  const rows = await getAllSupabaseRows<{ following_id: string }>(
    `/rest/v1/user_follows?follower_id=eq.${encodeURIComponent(viewer.userId)}&select=following_id`,
    { accessToken: viewer.token, expectedUserId: viewer.userId },
  );
  return new Set(rows.map(row => row.following_id).filter(Boolean));
}

/** Following shows posts from followed authors only; Team promotions are excluded. */
export async function loadFollowingPosts(): Promise<HomeCard[]> {
  const [posts, followed] = await Promise.all([getRemoteCommunityPosts(), loadFollowingAuthorIds()]);
  return posts
    .filter((post) => Boolean(post.authorId && followed.has(post.authorId)))
    .map((post) => ({ ...postToHomeCard(post), isFollowing: true }));
}

export async function loadProfileOverview() {
  const viewer = await requireViewer();
  const [profile, totals] = await Promise.all([
    getProfileById(viewer.token, viewer.userId),
    getActivityProfileTotals(viewer.userId),
  ]);
  const movingMinutes = Math.floor(totals.totalMovingSeconds / 60);
  const hours = Math.floor(movingMinutes / 60);
  const minutes = movingMinutes % 60;
  return {
    id: viewer.userId,
    fullName: profile?.full_name || profile?.username || '',
    username: profile?.username || '',
    avatarUrl: profile?.avatar_url || '',
    totalActivities: totals.totalActivities,
    totalDistanceKm: Math.round(totals.totalDistanceMeters / 100) / 10,
    movingTimeFormatted: `${hours}h ${minutes}m`,
    totalElevationGainMeters: totals.totalElevationGainMeters,
    // Streak and completed routes are not derivable from the current API.
    currentStreak: null as number | null,
    completedRoutes: null as number | null,
  };
}
