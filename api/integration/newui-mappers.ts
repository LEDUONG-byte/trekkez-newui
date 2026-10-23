import type { CommunityPost } from '../types/community';
import type { TripPlan } from '../types/activity';
import type { Team } from '../types/team';
import type { RouteSummary } from '../services/route/route-read';

/** View models mirror field names consumed by New UI without importing its screens. */
export type TeamCard = {
  id: string;
  name: string;
  isOwnedByYou: boolean;
  imageUrl: string;
  color: string;
  membersCount: number;
  description?: string;
  createdAt: string;
  isJoined: boolean;
  allowMatchmaking: boolean;
};
export type PlanCard = {
  id: string;
  title: string;
  isOwnedByYou: boolean;
  color: string;
  details?: string;
  startDate: string;
  createdAt: string;
};
export type HomePostCard = {
  itemType: 'POST';
  id: string;
  username: string;
  images: string[];
  tags: string[];
  caption: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowing?: boolean;
  feedTimestamp?: string;
  authorId?: string;
  authorIdentityVerified?: boolean;
};
export type HomeTeamCard = {
  itemType: 'TEAM';
  id: string;
  username: string;
  teamName: string;
  memberCount: number;
  maxMembers: number;
  isJoined: boolean;
  caption: string;
  feedTimestamp?: string;
};
export type HomeCard = HomePostCard | HomeTeamCard;

function isoDay(value?: string): string {
  if (!value) return '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
}

export function teamToCard(team: Team): TeamCard {
  return {
    id: team.id,
    name: team.name,
    isOwnedByYou: team.mine,
    imageUrl: team.imageUrl,
    color: team.mine ? '#BAE6FD' : '#FEF08A',
    membersCount: team.memberCount,
    description: team.description,
    createdAt: isoDay(team.createdAt),
    isJoined: team.joined || team.mine,
    allowMatchmaking: team.allowMatchmaking === true,
  };
}

export function planToCard(plan: TripPlan, viewerId: string): PlanCard {
  const localTime = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(plan.startAt);
  const dateText = localTime ? `${localTime[3]}-${localTime[2]}-${localTime[1]}` : isoDay(plan.startAt);
  return {
    id: plan.id,
    title: plan.title,
    isOwnedByYou: plan.ownerId === viewerId,
    color: plan.ownerId === viewerId ? '#BAE6FD' : '#FEF08A',
    details: plan.notes,
    startDate: dateText,
    createdAt: isoDay(plan.createdAt),
  };
}

export function routeToCard(route: RouteSummary): PlanCard {
  return {
    id: route.id,
    title: route.title,
    isOwnedByYou: route.mine,
    color: route.mine ? '#A7F3D0' : '#DDD6FE',
    details: route.details,
    startDate: route.startDate,
    createdAt: route.createdAt,
  };
}

export function postToHomeCard(post: CommunityPost): HomePostCard {
  return {
    itemType: 'POST',
    id: post.id,
    username: post.author,
    authorId: post.authorId,
    authorIdentityVerified: post.authorIdentityVerified,
    images: post.image ? [post.image] : [],
    tags: post.tag ? [post.tag] : [],
    caption: post.content || post.title,
    likeCount: post.likes,
    commentCount: post.comments,
    isLiked: post.liked === true,
    isBookmarked: post.saved === true,
    feedTimestamp: post.createdAt,
  };
}

export function teamToHomeCard(team: Team): HomeTeamCard {
  return {
    itemType: 'TEAM',
    id: `team_${team.id}`,
    username: team.name,
    teamName: team.name,
    memberCount: team.memberCount,
    maxMembers: team.maxMembers ?? 20,
    isJoined: team.joined || team.mine,
    caption: team.description,
    feedTimestamp: team.createdAt,
  };
}

function timestampOf(card: HomeCard): number {
  const value = card.feedTimestamp ? Date.parse(card.feedTimestamp) : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

export function interleaveHomeFeed(posts: HomePostCard[], teams: HomeTeamCard[]): HomeCard[] {
  const orderedPosts = [...posts].sort((a, b) => timestampOf(b) - timestampOf(a));
  const orderedTeams = [...teams].sort((a, b) => timestampOf(b) - timestampOf(a));
  const newestPost = orderedPosts.length ? timestampOf(orderedPosts[0]) : Number.NEGATIVE_INFINITY;
  const newestTeam = orderedTeams.length ? timestampOf(orderedTeams[0]) : Number.NEGATIVE_INFINITY;
  const firstType: HomeCard['itemType'] = newestTeam > newestPost ? 'TEAM' : 'POST';
  const result: HomeCard[] = [];
  let postIndex = 0;
  let teamIndex = 0;
  let nextType = firstType;

  while (postIndex < orderedPosts.length || teamIndex < orderedTeams.length) {
    if (nextType === 'POST' && postIndex < orderedPosts.length) {
      result.push(orderedPosts[postIndex++]);
      nextType = 'TEAM';
    } else if (nextType === 'TEAM' && teamIndex < orderedTeams.length) {
      result.push(orderedTeams[teamIndex++]);
      nextType = 'POST';
    } else if (postIndex < orderedPosts.length) {
      result.push(orderedPosts[postIndex++]);
    } else {
      result.push(orderedTeams[teamIndex++]);
    }
  }
  return result;
}
