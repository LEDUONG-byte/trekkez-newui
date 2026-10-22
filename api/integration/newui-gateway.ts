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
import { getUserFollowConnections } from '../services/community/social-supabase';
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
  const [routes, teams, categories] = await Promise.all([
    loadRouteCards(),
    getRemoteTeams(),
    getPlanItemCategories(),
  ]);
  return {
    routes,
    teams: teams.filter((team) => team.mine || team.joined).map((team) => ({ id: team.id, name: team.name })),
    categories,
  };
}

/** Explore contains post cards and team cards; no invented follows or avatars. */
export async function loadExploreFeed(): Promise<HomeCard[]> {
  await requireViewer();
  const [posts, teams] = await Promise.all([getRemoteCommunityPosts(), getRemoteTeams()]);
  return [...posts.map(postToHomeCard), ...teams.filter((team) => team.allowMatchmaking).map(teamToHomeCard)];
}

/** Following is based only on followed accounts, not speculative team following. */
export async function loadFollowingPosts(): Promise<HomeCard[]> {
  const viewer = await requireViewer();
  const [posts, follows] = await Promise.all([
    getRemoteCommunityPosts(),
    getUserFollowConnections(viewer.userId, 'following'),
  ]);
  const followed = new Set(follows.map((item) => item.userId));
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
