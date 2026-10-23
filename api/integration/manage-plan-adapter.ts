import type { TripPlan } from '../types/activity';
import type { RouteSummary } from '../services/route/route-read';
import type { Team, TeamMember } from '../types/team';

export type PlanDetailData = {
    id: string;
    name: string;
    difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME' | 'UNSPECIFIED';
    description: string;
    departureTime: string;
    arrivalTime: string;
    route: {
        id: string;
        name: string;
        totalDistanceKm?: number;
        estimatedDurationMinutes?: number;
        startPointName?: string;
        endPointName?: string;
        notes?: string;
    };
    team: {
        id: string;
        name: string;
        members: { id: string; name: string; avatarUrl?: string }[];
    };
    noteContent?: string;
};

export function toPlanManageDetails(
    plan: TripPlan,
    route: RouteSummary | null,
    team: Team | null,
    members: TeamMember[] = [],
): PlanDetailData {
    const difficulty = plan.difficulty === 'easy' ? 'EASY'
        : plan.difficulty === 'moderate' ? 'MODERATE'
        : plan.difficulty === 'hard' ? 'HARD' : 'UNSPECIFIED';
    return {
        id: plan.id,
        name: plan.title,
        difficulty,
        description: plan.notes || 'Chưa có mô tả.',
        departureTime: plan.startAt || 'Chưa đặt',
        arrivalTime: plan.expectedReturnAt || 'Chưa đặt',
        route: {
            id: plan.routeId,
            name: route?.title || (plan.routeId ? `Route ${plan.routeId.slice(0, 8)}` : 'Chưa chọn Route'),
            notes: route?.details || undefined,
        },
        team: {
            id: plan.teamId || '',
            name: (plan.teamId && team?.name) || (plan.teamId ? 'Không tải được tên Team' : 'Kế hoạch cá nhân'),
            members: (plan.teamId ? members : []).map(member => ({
                id: member.userId,
                name: member.displayName,
                avatarUrl: member.avatarUrl || undefined,
            })),
        },
        noteContent: plan.notes,
    };
}
