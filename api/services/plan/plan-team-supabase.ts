import { getAuthSession } from "../auth/auth-session";
import { getAllSupabaseRows, supabaseRequest } from "../core/supabase-client";
import {
  formatPlanDateTime,
  parsePlanDateTime,
} from "./trip-time";

import type { TripDifficulty, TripPlan } from "../../types/activity";
import type { PlanItemStatus, PlanMode, PlanRequiredItem } from "../../types/plan";
import type { SavedRoute } from "../../types/route";

type RemotePlanRow = {
  id: string;
  owner_id: string;
  route_id: string;
  team_id: string | null;
  mode: PlanMode;
  title: string;
  created_at: string;
  updated_at: string;
  start_at: string;
  expected_return_at: string | null;
  difficulty: TripDifficulty | null;
  elevation_gain_estimate_meters: number | null;
  members: string | null;
  notes: string | null;
  required_items: unknown;
};

type RemoteStatusRow = {
  plan_id: string;
  item_id: string;
  user_id: string;
  checked: boolean;
  updated_at?: string | null;
};

async function requirePlanAuth(expectedUserId?: string) {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth.userId) {
    throw new Error("Bạn cần đăng nhập để đồng bộ kế hoạch.");
  }

  if (expectedUserId && expectedUserId !== auth.userId) {
    throw new Error("Phiên đăng nhập đã thay đổi.");
  }

  return {
    accessToken: auth.accessToken,
    userId: auth.userId,
  };
}

function toIsoDateTime(value: string, label: string): string {
  const parsed = parsePlanDateTime(value);

  if (!parsed) {
    throw new Error(`${label} chưa đúng định dạng DD/MM/YYYY HH:mm.`);
  }

  return parsed.toISOString();
}

function fromRemoteDateTime(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatPlanDateTime(date);
}

function parseRequiredItems(value: unknown): PlanRequiredItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: PlanRequiredItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<PlanRequiredItem>;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.categoryId !== "string" ||
      typeof candidate.label !== "string"
    ) {
      continue;
    }

    result.push({
      id: candidate.id,
      categoryId: candidate.categoryId,
      label: candidate.label,
      custom: candidate.custom === true,
    });
  }

  return result;
}

function buildTripPlan(
  row: RemotePlanRow,
  statuses: RemoteStatusRow[] = [],
): TripPlan {
  const requiredItems = parseRequiredItems(row.required_items);
  const checked = new Map(statuses.map((status) => [status.item_id, status.checked]));

  return {
    id: row.id,
    routeId: row.route_id,
    title: row.title,
    createdAt: row.created_at,
    startAt: fromRemoteDateTime(row.start_at),
    expectedReturnAt: fromRemoteDateTime(row.expected_return_at) || undefined,
    difficulty: row.difficulty || undefined,
    elevationGainEstimateMeters:
      row.elevation_gain_estimate_meters ?? undefined,
    members: row.members || "",
    notes: row.notes || "",
    checklist: requiredItems.map((item) => ({
      id: item.id,
      label: item.label,
      checked: checked.get(item.id) === true,
    })),
    status: "planned",
    ownerId: row.owner_id,
    mode: row.mode,
    teamId: row.team_id || undefined,
    requiredItems,
  };
}

async function getOwnPlanStatuses(
  planId: string,
  expectedUserId?: string,
): Promise<RemoteStatusRow[]> {
  const auth = await requirePlanAuth(expectedUserId);

  const data = await supabaseRequest(
    `/rest/v1/team_plan_item_status?plan_id=eq.${encodeURIComponent(
      planId,
    )}&user_id=eq.${encodeURIComponent(
      auth.userId,
    )}&select=plan_id,item_id,user_id,checked,updated_at`,
    {
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
    },
  );

  return Array.isArray(data) ? (data as RemoteStatusRow[]) : [];
}

export async function createRemotePlan(plan: TripPlan): Promise<TripPlan> {
  const auth = await requirePlanAuth();

  const mode: PlanMode = plan.mode === "team" ? "team" : "personal";

  if (mode === "team" && !plan.teamId) {
    throw new Error("Hãy chọn nhóm cho kế hoạch.");
  }

  let data: unknown;
  try {
    data = await supabaseRequest("/rest/v1/team_plans", {
    method: "POST",
    accessToken: auth.accessToken,
    expectedUserId: auth.userId,
    headers: {
      Prefer: "return=representation",
    },
    body: [
      {
        id: plan.id,
        owner_id: auth.userId,
        route_id: plan.routeId,
        team_id: mode === "team" ? plan.teamId : null,
        mode,
        title: plan.title,
        start_at: toIsoDateTime(plan.startAt, "Thời gian bắt đầu"),
        expected_return_at: plan.expectedReturnAt
          ? toIsoDateTime(plan.expectedReturnAt, "Giờ quay về")
          : null,
        difficulty: plan.difficulty || null,
        elevation_gain_estimate_meters:
          plan.elevationGainEstimateMeters ?? null,
        members: plan.members || "",
        notes: plan.notes || "",
        required_items: plan.requiredItems || [],
      },
    ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Không thể lưu Plan lên Supabase (team_plans): ${message}`);
  }

  const row = Array.isArray(data) ? (data[0] as RemotePlanRow | undefined) : undefined;
  if (row?.id === plan.id) {
    return buildTripPlan(row);
  }

  // A successful HTTP response without a returned row is not proof of a saved plan.
  // Verify it with a subsequent read instead of incorrectly displaying FINISH.
  const confirmed = await getAllSupabaseRows<RemotePlanRow>(
    `/rest/v1/team_plans?id=eq.${encodeURIComponent(plan.id)}&owner_id=eq.${encodeURIComponent(auth.userId)}&select=*`,
    { accessToken: auth.accessToken, expectedUserId: auth.userId },
  );
  if (confirmed[0]) return buildTripPlan(confirmed[0]);
  throw new Error('Supabase chưa xác nhận đã lưu Plan. Kiểm tra quyền RLS/SELECT bảng team_plans.');
}

export async function createTeamForPlan(options: {
  plan: TripPlan;
  route: SavedRoute;
  teamId: string;
  teamName: string;
  maxMembers: number;
  allowMatchmaking: boolean;
}): Promise<TripPlan> {
  const auth = await requirePlanAuth();
  const plan = options.plan;
  const maxMembers = Math.min(100, Math.max(2, Math.round(options.maxMembers)));

  await supabaseRequest("/rest/v1/rpc/create_team_for_plan", {
    method: "POST",
    accessToken: auth.accessToken,
    expectedUserId: auth.userId,
    body: {
      p_team_id: options.teamId,
      p_plan_id: plan.id,
      p_team_name: options.teamName.trim(),
      p_route_id: plan.routeId,
      p_plan_title: plan.title,
      p_start_at: toIsoDateTime(plan.startAt, "Thời gian bắt đầu"),
      p_team_description: `Nhóm cho kế hoạch ${plan.title}`,
      p_team_level:
        plan.difficulty === "easy"
          ? "Người mới"
          : plan.difficulty === "hard"
            ? "Nâng cao"
            : "Trung bình",
      p_team_location: "",
      p_team_route_name: options.route.name,
      p_team_trip_date: plan.startAt.split(" ")[0] || "",
      p_team_meeting_point: "",
      p_team_note: plan.notes || "",
      p_team_image_url: null,
      p_max_members: maxMembers,
      p_allow_matchmaking: options.allowMatchmaking,
      p_expected_return_at: plan.expectedReturnAt
        ? toIsoDateTime(plan.expectedReturnAt, "Giờ quay về")
        : null,
      p_difficulty: plan.difficulty || null,
      p_elevation_gain_estimate_meters:
        plan.elevationGainEstimateMeters ?? null,
      p_members: plan.members || "",
      p_plan_notes: plan.notes || "",
      p_required_items: plan.requiredItems || [],
    },
  });

  return {
    ...plan,
    ownerId: auth.userId,
    mode: "team",
    teamId: options.teamId,
  };
}

/** Lists only plans visible to the authenticated user under server-side RLS. */
export async function getRemotePlans(expectedUserId?: string): Promise<TripPlan[]> {
  const auth = await requirePlanAuth(expectedUserId);
  const rows = await getAllSupabaseRows<RemotePlanRow>(
    "/rest/v1/team_plans?select=*&order=created_at.desc",
    { accessToken: auth.accessToken, expectedUserId: auth.userId },
  );
  if (rows.length === 0) return [];
  let statusRows: RemoteStatusRow[] = [];
  try {
    statusRows = await getAllSupabaseRows<RemoteStatusRow>(
      `/rest/v1/team_plan_item_status?user_id=eq.${encodeURIComponent(auth.userId)}` +
        `&select=plan_id,item_id,user_id,checked,updated_at`,
      { accessToken: auth.accessToken, expectedUserId: auth.userId },
    );
  } catch (error) {
    // Keep saved Plan cards visible if only the optional checklist-status read fails.
    console.warn('[TrekkEZ Plan] Checklist status unavailable:', error instanceof Error ? error.message : String(error));
  }
  const byPlan = new Map<string, RemoteStatusRow[]>();
  for (const status of statusRows) {
    const list = byPlan.get(status.plan_id) ?? [];
    list.push(status);
    byPlan.set(status.plan_id, list);
  }
  return rows.map((row) => buildTripPlan(row, byPlan.get(row.id) ?? []));
}

export async function getLatestTeamPlan(
  teamId: string,
): Promise<TripPlan | null> {
  const auth = await requirePlanAuth();

  const data = await supabaseRequest(
    `/rest/v1/team_plans?team_id=eq.${encodeURIComponent(
      teamId,
    )}&select=*&order=created_at.desc&limit=1`,
    {
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
    },
  );

  const rows = Array.isArray(data) ? (data as RemotePlanRow[]) : [];
  const row = rows[0];

  if (!row) {
    return null;
  }

  const statuses = await getOwnPlanStatuses(row.id, auth.userId);

  return buildTripPlan(row, statuses);
}

export async function setPlanItemChecked(
  planId: string,
  itemId: string,
  checked: boolean,
): Promise<PlanItemStatus> {
  const auth = await requirePlanAuth();

  const data = await supabaseRequest(
    "/rest/v1/team_plan_item_status?on_conflict=plan_id,item_id,user_id",
    {
      method: "POST",
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: [
        {
          plan_id: planId,
          item_id: itemId,
          user_id: auth.userId,
          checked,
        },
      ],
    },
  );

  const row = Array.isArray(data) ? (data[0] as RemoteStatusRow | undefined) : undefined;

  return {
    planId,
    itemId,
    userId: auth.userId,
    checked: row?.checked ?? checked,
    updatedAt: row?.updated_at || undefined,
  };
}
