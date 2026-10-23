import { getAuthSession } from "../auth/auth-session";
import { getAllSupabaseRows } from "../core/supabase-client";

export type UserNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  targetId: string | null;
  createdAt: string;
};

type RemoteNotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  target_id: string | null;
  created_at: string;
};

export async function getRemoteNotifications(
  expectedUserId?: string,
): Promise<UserNotification[]> {
  const session = await getAuthSession();
  if (!session?.accessToken || !session.userId) {
    throw new Error("Bạn cần đăng nhập để xem thông báo.");
  }
  if (expectedUserId && expectedUserId !== session.userId) {
    throw new Error("Phiên đăng nhập đã thay đổi.");
  }

  const rows = await getAllSupabaseRows<RemoteNotificationRow>(
    `/rest/v1/notifications?user_id=eq.${encodeURIComponent(session.userId)}&select=id,title,body,type,target_id,created_at&order=created_at.desc`,
    { accessToken: session.accessToken, expectedUserId: session.userId },
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    targetId: row.target_id,
    createdAt: row.created_at,
  }));
}
