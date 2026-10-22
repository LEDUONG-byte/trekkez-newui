import { getAuthSession } from "../auth/auth-session";
import { supabaseRequest } from "../core/supabase-client";
import { clearTeamJoinRequestCache } from "./team-join-request";

export type TeamInvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export type TeamInviteCandidate = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  invitationStatus?: TeamInvitationStatus;
  isMember: boolean;
};

export type TeamInvitation = {
  teamId: string;
  userId: string;
  invitedAt: string;
  status: TeamInvitationStatus;
  respondedAt?: string;
  displayName: string;
  avatarUrl: string;
};

export type MyTeamInvitation = {
  teamId: string;
  teamName: string;
  level: string;
  location: string;
  routeName: string;
  tripDate: string;
  memberCount: number;
  maxMembers: number;
  status: TeamInvitationStatus;
  invitedAt: string;
  inviterName: string;
  inviterAvatarUrl: string;
};

type RemoteCandidate = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  invitation_status: TeamInvitationStatus | null;
  is_member: boolean | null;
};

type RemoteInvitation = {
  team_id: string;
  user_id: string;
  invited_at: string;
  status: TeamInvitationStatus;
  responded_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type RemoteMyInvitation = {
  team_id: string;
  team_name: string;
  team_level: string | null;
  team_location: string | null;
  team_route_name: string | null;
  team_trip_date: string | null;
  member_count: number | string | null;
  max_members: number | string | null;
  status: TeamInvitationStatus;
  invited_at: string;
  inviter_name: string | null;
  inviter_avatar_url: string | null;
};

async function requireInvitationAuth() {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth.userId) {
    throw new Error("Bạn cần đăng nhập để sử dụng lời mời nhóm.");
  }

  return {
    accessToken: auth.accessToken,
    userId: auth.userId,
  };
}

function invitationError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();

  if (message.includes("team is full")) {
    return new Error("Nhóm đã đủ thành viên.");
  }

  if (message.includes("reserve all remaining team slots")) {
    return new Error(
      "Các lời mời đang chờ đã chiếm hết số chỗ còn lại của nhóm.",
    );
  }

  if (message.includes("already a team member")) {
    return new Error("Người dùng này đã là thành viên của nhóm.");
  }

  if (message.includes("already pending") || message.includes("no longer pending")) {
    return new Error("Lời mời này không còn ở trạng thái chờ xử lý.");
  }

  if (message.includes("only the team owner")) {
    return new Error("Chỉ chủ nhóm mới có thể quản lý lời mời.");
  }

  if (message.includes("invitation not found")) {
    return new Error("Không tìm thấy lời mời tham gia nhóm.");
  }

  return error instanceof Error ? error : new Error(raw);
}

export async function searchTeamInviteCandidates(
  query: string,
  teamId?: string,
): Promise<TeamInviteCandidate[]> {
  const clean = query.trim();

  if (clean.length < 2) {
    return [];
  }

  const auth = await requireInvitationAuth();

  try {
    const data = await supabaseRequest(
      "/rest/v1/rpc/search_team_invite_candidates",
      {
        method: "POST",
        accessToken: auth.accessToken,
        expectedUserId: auth.userId,
        body: {
          p_query: clean,
          p_team_id: teamId || null,
        },
      },
    );

    const rows = Array.isArray(data) ? (data as RemoteCandidate[]) : [];

    return rows.map((row) => ({
      userId: row.user_id,
      username: row.username || "",
      displayName: row.full_name || row.username || "Người dùng TrekkEZ",
      avatarUrl: row.avatar_url || "",
      invitationStatus: row.invitation_status || undefined,
      isMember: Boolean(row.is_member),
    }));
  } catch (error) {
    throw invitationError(error);
  }
}

export async function inviteUserToTeam(
  teamId: string,
  userId: string,
): Promise<"sent" | "pending"> {
  const auth = await requireInvitationAuth();

  try {
    const data = await supabaseRequest("/rest/v1/rpc/invite_user_to_team", {
      method: "POST",
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
      body: {
        p_team_id: teamId,
        p_user_id: userId,
      },
    });

    const value = Array.isArray(data) ? data[0] : data;

    return value === "pending" ? "pending" : "sent";
  } catch (error) {
    throw invitationError(error);
  }
}

export async function inviteUsersToTeam(
  teamId: string,
  users: Pick<TeamInviteCandidate, "userId" | "displayName">[],
): Promise<{
  sent: number;
  failed: Array<{ userId: string; displayName: string; message: string }>;
}> {
  let sent = 0;
  const failed: Array<{
    userId: string;
    displayName: string;
    message: string;
  }> = [];

  for (const user of users) {
    try {
      await inviteUserToTeam(teamId, user.userId);
      sent += 1;
    } catch (error) {
      failed.push({
        userId: user.userId,
        displayName: user.displayName,
        message: error instanceof Error ? error.message : "Không gửi được lời mời.",
      });
    }
  }

  return { sent, failed };
}

export async function getTeamInvitations(
  teamId: string,
): Promise<TeamInvitation[]> {
  const auth = await requireInvitationAuth();

  try {
    const data = await supabaseRequest(
      "/rest/v1/rpc/get_team_invitations_with_profiles",
      {
        method: "POST",
        accessToken: auth.accessToken,
        expectedUserId: auth.userId,
        body: {
          p_team_id: teamId,
        },
      },
    );

    const rows = Array.isArray(data) ? (data as RemoteInvitation[]) : [];

    return rows.map((row) => ({
      teamId: row.team_id,
      userId: row.user_id,
      invitedAt: row.invited_at,
      status: row.status,
      respondedAt: row.responded_at || undefined,
      displayName: row.display_name || "Người dùng TrekkEZ",
      avatarUrl: row.avatar_url || "",
    }));
  } catch (error) {
    throw invitationError(error);
  }
}

export async function cancelTeamInvitation(
  teamId: string,
  userId: string,
): Promise<void> {
  const auth = await requireInvitationAuth();

  try {
    await supabaseRequest("/rest/v1/rpc/cancel_team_invitation", {
      method: "POST",
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
      body: {
        p_team_id: teamId,
        p_user_id: userId,
      },
    });
  } catch (error) {
    throw invitationError(error);
  }
}

export async function getMyTeamInvitation(
  teamId: string,
): Promise<MyTeamInvitation | null> {
  const auth = await requireInvitationAuth();

  try {
    const data = await supabaseRequest(
      "/rest/v1/rpc/get_my_team_invitation",
      {
        method: "POST",
        accessToken: auth.accessToken,
        expectedUserId: auth.userId,
        body: {
          p_team_id: teamId,
        },
      },
    );

    const rows = Array.isArray(data)
      ? (data as RemoteMyInvitation[])
      : data && typeof data === "object"
        ? [data as RemoteMyInvitation]
        : [];

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      teamId: row.team_id,
      teamName: row.team_name,
      level: row.team_level || "Tất cả cấp độ",
      location: row.team_location || "",
      routeName: row.team_route_name || "",
      tripDate: row.team_trip_date || "",
      memberCount: Math.max(0, Number(row.member_count ?? 0) || 0),
      maxMembers: Math.max(2, Number(row.max_members ?? 20) || 20),
      status: row.status,
      invitedAt: row.invited_at,
      inviterName: row.inviter_name || "Chủ nhóm TrekkEZ",
      inviterAvatarUrl: row.inviter_avatar_url || "",
    };
  } catch (error) {
    throw invitationError(error);
  }
}

export async function acceptTeamInvitation(teamId: string): Promise<void> {
  const auth = await requireInvitationAuth();

  try {
    await supabaseRequest("/rest/v1/rpc/accept_team_invitation", {
      method: "POST",
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
      body: {
        p_team_id: teamId,
      },
    });

    clearTeamJoinRequestCache(auth.userId);
  } catch (error) {
    throw invitationError(error);
  }
}

export async function rejectTeamInvitation(teamId: string): Promise<void> {
  const auth = await requireInvitationAuth();

  try {
    await supabaseRequest("/rest/v1/rpc/reject_team_invitation", {
      method: "POST",
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
      body: {
        p_team_id: teamId,
      },
    });
  } catch (error) {
    throw invitationError(error);
  }
}
