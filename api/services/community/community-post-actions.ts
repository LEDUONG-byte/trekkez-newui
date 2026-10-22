import { getAuthSession } from "../auth/auth-session";

import { supabaseRequest } from "../core/supabase-client";

export async function deleteRemoteCommunityPost(
  postId: string,

  expectedUserId?: string,
): Promise<void> {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth?.userId) {
    throw new Error("Bạn cần đăng nhập để xóa bài viết.");
  }

  if (expectedUserId && auth.userId !== expectedUserId) {
    throw new Error("Phiên đăng nhập đã thay đổi.");
  }

  await supabaseRequest("/rest/v1/rpc/delete_own_community_post", {
    method: "POST",

    accessToken: auth.accessToken,

    expectedUserId: auth.userId,

    body: {
      p_post_id: postId,
    },
  });
}
