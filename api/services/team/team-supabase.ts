import { getAuthSession } from "../auth/auth-session";

import {
  getAllSupabaseRows,
  supabaseRequest,
} from "../core/supabase-client";

import type { Team, TeamInput, TeamMember } from "../../types/team";

type RemoteTeamRow = {
  id: string;
  owner_id: string;

  name: string;
  description: string | null;
  max_members: number | null;
  allow_matchmaking: boolean | null;

  level: string | null;
  location: string | null;
  route_name: string | null;
  trip_date: string | null;

  meeting_point: string | null;
  note: string | null;

  image_url: string | null;

  created_at: string;
  updated_at: string;
};

type RemoteTeamMemberRow = {
  team_id: string;
  user_id: string;

  role: "owner" | "member";

  joined_at: string;

  display_name?: string | null;
  avatar_url?: string | null;
};

async function requireTeamAuth(expectedUserId?: string) {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth?.userId) {
    throw new Error("Không có phiên đăng nhập để đồng bộ Team.");
  }

  if (expectedUserId && auth.userId !== expectedUserId) {
    throw new Error("Phiên đăng nhập đã thay đổi.");
  }

  return {
    accessToken: auth.accessToken,

    userId: auth.userId,
  };
}

function buildTeams(
  rows: RemoteTeamRow[],
  members: RemoteTeamMemberRow[],
  userId: string,
): Team[] {
  const memberCount = new Map<string, number>();

  const joined = new Set<string>();

  for (const member of members) {
    memberCount.set(
      member.team_id,

      (memberCount.get(member.team_id) ?? 0) + 1,
    );

    if (member.user_id === userId) {
      joined.add(member.team_id);
    }
  }

  return rows.map((row) => ({
    id: row.id,

    ownerId: row.owner_id,

    name: row.name,

    description: row.description ?? "",

    memberCount: memberCount.get(row.id) ?? 0,

    maxMembers: Math.max(2, Number(row.max_members ?? 20)),

    allowMatchmaking: row.allow_matchmaking ?? true,

    level: row.level ?? "Tất cả cấp độ",

    location: row.location ?? "",

    routeName: row.route_name ?? "",

    tripDate: row.trip_date ?? "",

    meetingPoint: row.meeting_point ?? "",

    note: row.note ?? "",

    imageUrl: row.image_url ?? "",

    joined: joined.has(row.id),

    mine: row.owner_id === userId,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  }));
}

export async function getRemoteTeams(expectedUserId?: string): Promise<Team[]> {
  const auth = await requireTeamAuth(expectedUserId);

  const [teamRows, memberRows] = await Promise.all([
    getAllSupabaseRows<RemoteTeamRow>(
      "/rest/v1/teams?select=*&order=created_at.desc",
      {
        accessToken: auth.accessToken,

        expectedUserId: auth.userId,
      },
    ),

    getAllSupabaseRows<RemoteTeamMemberRow>(
      "/rest/v1/team_members?select=team_id,user_id,role,joined_at",
      {
        accessToken: auth.accessToken,

        expectedUserId: auth.userId,
      },
    ),
  ]);

  return buildTeams(teamRows, memberRows, auth.userId);
}

export async function getRemoteTeamMembers(
  teamId: string,
  expectedUserId?: string,
): Promise<TeamMember[]> {
  const auth = await requireTeamAuth(expectedUserId);

  const data = await supabaseRequest(
    "/rest/v1/rpc/get_team_members_with_profiles",
    {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      body: {
        p_team_id: teamId,
      },
    },
  );

  const rows = Array.isArray(data) ? (data as RemoteTeamMemberRow[]) : [];

  return rows.map((row) => ({
    teamId: row.team_id,

    userId: row.user_id,

    role: row.role,

    joinedAt: row.joined_at,

    displayName: row.display_name || "Thành viên TrekkEZ",

    avatarUrl: row.avatar_url || "",
  }));
}

export async function getRemoteTeam(
  teamId: string,
  expectedUserId?: string,
): Promise<Team | null> {
  const auth = await requireTeamAuth(expectedUserId);

  const encodedTeamId = encodeURIComponent(teamId);

  const [teamRows, memberRows] = await Promise.all([
    getAllSupabaseRows<RemoteTeamRow>(
      `/rest/v1/teams?id=eq.${encodedTeamId}&select=*`,
      {
        accessToken: auth.accessToken,

        expectedUserId: auth.userId,
      },
    ),

    getAllSupabaseRows<RemoteTeamMemberRow>(
      `/rest/v1/team_members?team_id=eq.${encodedTeamId}&select=team_id,user_id,role,joined_at`,
      {
        accessToken: auth.accessToken,

        expectedUserId: auth.userId,
      },
    ),
  ]);

  if (teamRows.length === 0) {
    return null;
  }

  return buildTeams(teamRows, memberRows, auth.userId)[0] ?? null;
}

export async function uploadTeam(
  team: TeamInput,
  expectedUserId?: string,
): Promise<void> {
  const auth = await requireTeamAuth(expectedUserId);

  await supabaseRequest("/rest/v1/teams?on_conflict=id", {
    method: "POST",

    accessToken: auth.accessToken,

    expectedUserId: auth.userId,

    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },

    body: [
      {
        id: team.id,

        owner_id: auth.userId,

        name: team.name,

        description: team.description,

        level: team.level,

        location: team.location,

        route_name: team.routeName,

        trip_date: team.tripDate,

        meeting_point: team.meetingPoint,

        note: team.note,

        image_url: team.imageUrl || null,
      },
    ],
  });
}

export async function deleteRemoteTeam(
  teamId: string,
  expectedUserId?: string,
): Promise<void> {
  const auth = await requireTeamAuth(expectedUserId);

  await supabaseRequest(
    `/rest/v1/teams?id=eq.${encodeURIComponent(
      teamId,
    )}&owner_id=eq.${encodeURIComponent(auth.userId)}`,
    {
      method: "DELETE",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      headers: {
        Prefer: "return=minimal",
      },
    },
  );
}

export async function setRemoteTeamJoined(
  teamId: string,
  joined: boolean,
  expectedUserId?: string,
): Promise<void> {
  const auth = await requireTeamAuth(expectedUserId);

  if (joined) {
    throw new Error(
      "Nhóm này sử dụng cơ chế duyệt thành viên. Hãy gửi yêu cầu tham gia thay vì thêm thành viên trực tiếp.",
    );
  }

  await supabaseRequest(
    `/rest/v1/team_members?team_id=eq.${encodeURIComponent(
      teamId,
    )}&user_id=eq.${encodeURIComponent(auth.userId)}&role=eq.member`,
    {
      method: "DELETE",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      headers: {
        Prefer: "return=minimal",
      },
    },
  );
}

export async function removeRemoteTeamMember(
  teamId: string,
  memberUserId: string,
  expectedUserId?: string,
): Promise<void> {
  const auth = await requireTeamAuth(expectedUserId);

  if (memberUserId === auth.userId) {
    throw new Error("Chủ nhóm không thể tự xóa mình khỏi nhóm.");
  }

  await supabaseRequest(
    `/rest/v1/team_members?team_id=eq.${encodeURIComponent(
      teamId,
    )}&user_id=eq.${encodeURIComponent(memberUserId)}&role=eq.member`,
    {
      method: "DELETE",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      headers: {
        Prefer: "return=minimal",
      },
    },
  );
}
