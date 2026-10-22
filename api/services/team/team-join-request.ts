import { getAuthSession } from "../auth/auth-session";

import {
  getAllSupabaseRows,
  supabaseRequest,
} from "../core/supabase-client";

export type TeamJoinRequest = {
  teamId: string;

  userId: string;

  requestedAt: string;

  displayName: string;

  avatarUrl: string;
};

type RemoteJoinRequest = {
  team_id: string;

  user_id: string;

  created_at?: string;

  requested_at?: string;

  display_name?: string | null;

  avatar_url?: string | null;
};

type RemoteTeamCapacity = {
  max_members: number | null;
};

const myPendingIdsCache = new Map<string, Set<string>>();

const myPendingIdsPromises = new Map<string, Promise<Set<string>>>();

async function requireTeamRequestAuth(): Promise<{
  accessToken: string;
  userId: string;
}> {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth?.userId) {
    throw new Error("Bạn cần đăng nhập để sử dụng tính năng nhóm.");
  }

  return {
    accessToken: auth.accessToken,

    userId: auth.userId,
  };
}

export function clearTeamJoinRequestCache(userId?: string) {
  if (userId) {
    myPendingIdsCache.delete(userId);

    myPendingIdsPromises.delete(userId);

    return;
  }

  myPendingIdsCache.clear();

  myPendingIdsPromises.clear();
}

export async function getMyPendingTeamJoinRequestIds(
  force = false,
): Promise<Set<string>> {
  const auth = await requireTeamRequestAuth();

  if (!force) {
    const cached = myPendingIdsCache.get(auth.userId);

    if (cached) {
      return new Set(cached);
    }

    const existing = myPendingIdsPromises.get(auth.userId);

    if (existing) {
      return new Set(await existing);
    }
  }

  const task = getAllSupabaseRows<RemoteJoinRequest>(
    `/rest/v1/team_join_requests?user_id=eq.${encodeURIComponent(
      auth.userId,
    )}&select=team_id,user_id,created_at`,

    {
      accessToken: auth.accessToken,

      expectedUserId: auth.userId,
    },
  )
    .then((rows) => {
      const ids = new Set(rows.map((row) => row.team_id));

      myPendingIdsCache.set(
        auth.userId,

        ids,
      );

      return ids;
    })
    .finally(() => {
      if (myPendingIdsPromises.get(auth.userId) === task) {
        myPendingIdsPromises.delete(auth.userId);
      }
    });

  myPendingIdsPromises.set(
    auth.userId,

    task,
  );

  return new Set(await task);
}

export async function requestTeamJoin(teamId: string): Promise<void> {
  const auth = await requireTeamRequestAuth();

  await supabaseRequest(
    "/rest/v1/team_join_requests?on_conflict=team_id,user_id",

    {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      headers: {
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },

      body: [
        {
          team_id: teamId,

          user_id: auth.userId,
        },
      ],
    },
  );

  const next = new Set(myPendingIdsCache.get(auth.userId) ?? []);

  next.add(teamId);

  myPendingIdsCache.set(
    auth.userId,

    next,
  );
}

export async function cancelTeamJoinRequest(teamId: string): Promise<void> {
  const auth = await requireTeamRequestAuth();

  await supabaseRequest(
    `/rest/v1/team_join_requests?team_id=eq.${encodeURIComponent(
      teamId,
    )}&user_id=eq.${encodeURIComponent(auth.userId)}`,

    {
      method: "DELETE",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      headers: {
        Prefer: "return=minimal",
      },
    },
  );

  const cached = myPendingIdsCache.get(auth.userId);

  if (cached) {
    const next = new Set(cached);

    next.delete(teamId);

    myPendingIdsCache.set(
      auth.userId,

      next,
    );
  }
}

export async function getTeamJoinRequests(
  teamId: string,
): Promise<TeamJoinRequest[]> {
  const auth = await requireTeamRequestAuth();

  const data = await supabaseRequest(
    "/rest/v1/rpc/get_team_join_requests_with_profiles",

    {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      body: {
        p_team_id: teamId,
      },
    },
  );

  const rows = Array.isArray(data) ? (data as RemoteJoinRequest[]) : [];

  return rows.map((row) => ({
    teamId: row.team_id,

    userId: row.user_id,

    requestedAt: row.requested_at ?? row.created_at ?? "",

    displayName: row.display_name || "Thành viên TrekkEZ",

    avatarUrl: row.avatar_url || "",
  }));
}

export async function approveTeamJoinRequest(
  teamId: string,

  userId: string,
): Promise<void> {
  const auth = await requireTeamRequestAuth();

  await supabaseRequest(
    "/rest/v1/rpc/approve_team_join_request",

    {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      body: {
        p_team_id: teamId,

        p_user_id: userId,
      },
    },
  );
}

export async function rejectTeamJoinRequest(
  teamId: string,

  userId: string,
): Promise<void> {
  const auth = await requireTeamRequestAuth();

  await supabaseRequest(
    "/rest/v1/rpc/reject_team_join_request",

    {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      body: {
        p_team_id: teamId,

        p_user_id: userId,
      },
    },
  );
}

export async function getTeamMaxMembers(teamId: string): Promise<number> {
  const auth = await requireTeamRequestAuth();

  const rows = await getAllSupabaseRows<RemoteTeamCapacity>(
    `/rest/v1/teams?id=eq.${encodeURIComponent(teamId)}&select=max_members`,

    {
      accessToken: auth.accessToken,

      expectedUserId: auth.userId,
    },
  );

  const value = Number(rows[0]?.max_members ?? 20);

  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.max(
    2,

    Math.floor(value),
  );
}

export async function updateTeamMaxMembers(
  teamId: string,
  maxMembers: number,
): Promise<void> {
  const auth = await requireTeamRequestAuth();

  if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 100) {
    throw new Error("Giới hạn thành viên phải từ 2 đến 100.");
  }

  await supabaseRequest(
    `/rest/v1/teams?id=eq.${encodeURIComponent(
      teamId,
    )}&owner_id=eq.${encodeURIComponent(auth.userId)}`,
    {
      method: "PATCH",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      headers: {
        Prefer: "return=minimal",
      },

      body: {
        max_members: maxMembers,
      },
    },
  );
}

export async function getTeamJoinRequestCount(teamId: string): Promise<number> {
  const auth = await requireTeamRequestAuth();

  const data = await supabaseRequest(
    "/rest/v1/rpc/get_team_join_request_count",
    {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      body: {
        p_team_id: teamId,
      },
    },
  );

  const value =
    typeof data === "number"
      ? data
      : Array.isArray(data)
        ? Number(data[0] ?? 0)
        : Number(data ?? 0);

  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
