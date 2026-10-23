/** Only types needed by New UI Plan and Profile; Watch/GPS tracker are excluded. */
import type { PlanMode, PlanRequiredItem } from './plan';

export type TripDifficulty = 'easy' | 'moderate' | 'hard';

export type TripChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type TripPlan = {
  id: string;
  routeId: string;
  title: string;
  createdAt: string;
  startAt: string;
  expectedReturnAt?: string;
  difficulty?: TripDifficulty;
  elevationGainEstimateMeters?: number;
  members: string;
  notes: string;
  checklist: TripChecklistItem[];
  status: 'planned' | 'active' | 'completed';
  ownerId?: string;
  mode?: PlanMode;
  teamId?: string;
  requiredItems?: PlanRequiredItem[];
};

/** Lightweight server-side summaries for Profile statistics only. */
export type ActivitySessionSummary = {
  id: string;
  routeId: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
};

export type ActivityProfileTotals = {
  totalActivities: number;
  totalDistanceMeters: number;
  totalMovingSeconds: number;
  totalElevationGainMeters: number;
};
