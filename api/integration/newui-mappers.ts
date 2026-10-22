import type { CommunityPost } from '../types/community';
import type { TripPlan } from '../types/activity';
import type { Team } from '../types/team';
import type { RouteSummary } from '../services/route/route-read';

/** View models mirror field names consumed by New UI without importing its screens. */
export type TeamCard = {
  id: string;
  name: string;
  isOwnedByYou: boolean;
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
  authorId?: string;
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
    color: team.mine ? '#BAE6FD' : '#FEF08A',
    membersCount: team.memberCount,
    description: team.description,
    createdAt: isoDay(team.createdAt),
    isJoined: team.joined || team.mine,
    allowMatchmaking: team.allowMatchmaking !== false,
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
    images: post.image ? [post.image] : [],
    tags: post.tag ? [post.tag] : [],
    caption: post.content || post.title,
    likeCount: post.likes,
    commentCount: post.comments,
    isLiked: post.liked === true,
    isBookmarked: post.saved === true,
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
  };
}
