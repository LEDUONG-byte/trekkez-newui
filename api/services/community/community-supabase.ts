import { getAuthSession } from "../auth/auth-session";
import {
  getAllSupabaseRows,
  supabaseRequest,
  uploadSupabaseStorageFile,
} from "../core/supabase-client";
import type { CommunityComment, CommunityPost } from "../../types/community";

type RemotePostRow = {
  id: string;
  owner_id: string | null;
  author: string;
  time_text: string;
  location: string;
  title: string;
  content: string;
  image: string;
  tag: CommunityPost["tag"];
  base_likes: number;
  base_comments: number;
  created_at: string;
  updated_at: string;
};

type RemoteLikeRow = {
  post_id: string;
  user_id: string;
};

type RemoteSaveRow = {
  post_id: string;
  user_id: string;
};

type RemoteCommentRow = {
  id: string;
  post_id: string;
  user_id: string | null;
  name: string;
  text: string;
  time_text: string;
  created_at: string;
  updated_at: string;
};

export type UploadCommunityPostResult = {
  postId: string;
  imageUrl: string;
};

async function requireCommunityAuth(expectedUserId?: string) {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth?.userId) {
    throw new Error("Không có phiên đăng nhập để sử dụng Community.");
  }

  if (expectedUserId && auth.userId !== expectedUserId) {
    throw new Error("Phiên đăng nhập đã thay đổi.");
  }

  return {
    accessToken: auth.accessToken,
    userId: auth.userId,
  };
}

function isSampleId(id: string): boolean {
  return id.startsWith("sample-");
}

function countByPostId(rows: Array<{ post_id: string }>) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }

  return counts;
}

function normalizeImageMimeType(
  mimeType: string | null | undefined,
  uri: string,
) {
  const clean = mimeType?.toLowerCase().trim();

  if (clean === "image/png") {
    return "image/png";
  }

  if (clean === "image/webp") {
    return "image/webp";
  }

  if (clean === "image/jpeg" || clean === "image/jpg") {
    return "image/jpeg";
  }

  const uriLower = uri.toLowerCase();

  if (uriLower.includes(".png")) {
    return "image/png";
  }

  if (uriLower.includes(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function getImageExtension(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function isLocalImageUri(uri: string) {
  return uri.startsWith("file://") || uri.startsWith("content://");
}

function sanitizeStorageId(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadCommunityImage(
  fileUri: string,
  mimeType?: string | null,
  postId?: string,
  expectedUserId?: string,
): Promise<string> {
  const auth = await requireCommunityAuth(expectedUserId);

  if (!fileUri) {
    throw new Error("Không có ảnh để upload.");
  }

  if (!isLocalImageUri(fileUri)) {
    return fileUri;
  }

  const cleanMimeType = normalizeImageMimeType(mimeType, fileUri);
  const extension = getImageExtension(cleanMimeType);
  const stableName = postId
    ? `post-${sanitizeStorageId(postId)}.${extension}`
    : `post-${Date.now()}.${extension}`;
  const objectPath = `${auth.userId}/${stableName}`;

  const publicUrl = await uploadSupabaseStorageFile({
    bucket: "community-images",
    objectPath,
    fileUri,
    contentType: cleanMimeType,
    accessToken: auth.accessToken,
    expectedUserId: auth.userId,
    upsert: Boolean(postId),
    readErrorMessage: "Không đọc được ảnh Community trên thiết bị.",
  });

  return publicUrl;
}

export async function uploadCommunityPost(
  post: CommunityPost,
  imageMimeType?: string | null,
  expectedUserId?: string,
): Promise<UploadCommunityPostResult> {
  const auth = await requireCommunityAuth(expectedUserId);

  if (isSampleId(post.id)) {
    throw new Error("Không đồng bộ dữ liệu mẫu Community.");
  }

  let imageUrl = post.image;

  if (isLocalImageUri(imageUrl)) {
    imageUrl = await uploadCommunityImage(
      imageUrl,
      imageMimeType,
      post.id,
      auth.userId,
    );
  }

  const authorProfiles = await getAllSupabaseRows<{ id: string; full_name: string | null; username: string | null }>(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(auth.userId)}&select=id,full_name,username`,
    { accessToken: auth.accessToken, expectedUserId: auth.userId },
  );
  const verifiedAuthor = authorProfiles[0]?.full_name?.trim() || authorProfiles[0]?.username?.trim();
  if (!verifiedAuthor) throw new Error('Tài khoản chưa có tên Profile để đăng bài.');

  await supabaseRequest("/rest/v1/community_posts?on_conflict=id", {
    method: "POST",
    accessToken: auth.accessToken,
    expectedUserId: auth.userId,
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: [
      {
        id: post.id,
        owner_id: auth.userId,
        author: verifiedAuthor,
        time_text: post.time,
        location: post.location,
        title: post.title,
        content: post.content,
        image: imageUrl,
        tag: post.tag,
        base_likes: 0,
        base_comments: 0,
      },
    ],
  });

  return {
    postId: post.id,
    imageUrl,
  };
}

export async function getRemoteCommunityPosts(
  expectedUserId?: string,
): Promise<CommunityPost[]> {
  const auth = await requireCommunityAuth(expectedUserId);

  const requestOptions = {
    accessToken: auth.accessToken,
    expectedUserId: auth.userId,
  };

  const [postRows, likeRows, saveRows, commentRows] = await Promise.all([
    getAllSupabaseRows<RemotePostRow>(
      "/rest/v1/community_posts?select=*&order=created_at.desc",
      requestOptions,
    ),
    getAllSupabaseRows<RemoteLikeRow>(
      "/rest/v1/community_post_likes?select=post_id,user_id",
      requestOptions,
    ),
    getAllSupabaseRows<RemoteSaveRow>(
      `/rest/v1/community_post_saves?user_id=eq.${encodeURIComponent(
        auth.userId,
      )}&select=post_id,user_id`,
      requestOptions,
    ),
    getAllSupabaseRows<RemoteCommentRow>(
      "/rest/v1/community_comments?select=id,post_id,user_id,name,text,time_text,created_at,updated_at",
      requestOptions,
    ),
  ]);

  const cleanPostRows = postRows.filter((row) => !isSampleId(row.id));
  const cleanPostIds = new Set(cleanPostRows.map((row) => row.id));
  const cleanLikeRows = likeRows.filter((row) => cleanPostIds.has(row.post_id));
  const cleanSaveRows = saveRows.filter((row) => cleanPostIds.has(row.post_id));
  const cleanCommentRows = commentRows.filter((row) =>
    cleanPostIds.has(row.post_id),
  );

  const likeCounts = countByPostId(cleanLikeRows);
  const commentCounts = countByPostId(cleanCommentRows);
  const likedPostIds = new Set(
    cleanLikeRows
      .filter((row) => row.user_id === auth.userId)
      .map((row) => row.post_id),
  );
  const savedPostIds = new Set(cleanSaveRows.map((row) => row.post_id));

  // Legacy data may contain a post labeled as a different person than its owner_id.
  // Do not reassign ownership or rewrite the author's historical text.
  // Mark an unverified attribution and keep that post in Explore, not Following.
  type OwnerProfileRow = { id: string; full_name: string | null; username: string | null };
  const owners = [...new Set(cleanPostRows.map(row => row.owner_id).filter((id): id is string => Boolean(id)))];
  const profiles = new Map<string, OwnerProfileRow>();
  if (owners.length) {
    try {
      const rows = await getAllSupabaseRows<OwnerProfileRow>(
        `/rest/v1/profiles?id=in.(${owners.map(encodeURIComponent).join(',')})&select=id,full_name,username`,
        requestOptions,
      );
      rows.forEach(profile => profiles.set(profile.id, profile));
    } catch (error) {
      if (__DEV__) console.warn('[TrekkEZ Following] Owner profile lookup unavailable; author verification skipped.', error);
    }
  }
  const normalizedName = (text: string | null | undefined) =>
    (text || '').trim().replace(/^@/, '').replace(/\s+/g, ' ').toLocaleLowerCase();

  return cleanPostRows.map(
    (row): CommunityPost => ({
      id: row.id,
      author: row.author,
      time: row.time_text,
      location: row.location,
      title: row.title,
      content: row.content,
      image: row.image,
      likes: row.base_likes + (likeCounts.get(row.id) ?? 0),
      comments: row.base_comments + (commentCounts.get(row.id) ?? 0),
      tag: row.tag,
      liked: likedPostIds.has(row.id),
      saved: savedPostIds.has(row.id),
      mine: row.owner_id === auth.userId,
      authorId: row.owner_id ?? undefined,
      authorIdentityVerified: !row.owner_id || !profiles.has(row.owner_id) ||
        [profiles.get(row.owner_id)?.full_name, profiles.get(row.owner_id)?.username]
          .some(name => Boolean(normalizedName(name)) && normalizedName(name) === normalizedName(row.author)),
    }),
  );
}

export async function getRemoteCommunityComments(
  postId: string,
  expectedUserId?: string,
): Promise<CommunityComment[]> {
  const auth = await requireCommunityAuth(expectedUserId);

  if (isSampleId(postId)) {
    return [];
  }

  const rows = await getAllSupabaseRows<RemoteCommentRow>(
    `/rest/v1/community_comments?post_id=eq.${encodeURIComponent(
      postId,
    )}&select=id,post_id,user_id,name,text,time_text,created_at,updated_at&order=created_at.asc`,
    {
      accessToken: auth.accessToken,
      expectedUserId: auth.userId,
    },
  );

  type CommentProfileRow = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  const commenterIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];
  const profilesById = new Map<string, CommentProfileRow>();
  if (commenterIds.length > 0) {
    try {
      const profiles = await getAllSupabaseRows<CommentProfileRow>(
        `/rest/v1/profiles?id=in.(${commenterIds.map(encodeURIComponent).join(",")})&select=id,full_name,username,avatar_url`,
        {
          accessToken: auth.accessToken,
          expectedUserId: auth.userId,
        },
      );
      profiles.forEach((profile) => profilesById.set(profile.id, profile));
    } catch (error) {
      if (__DEV__) console.warn("[TrekkEZ Comments] Could not load commenter profiles; using names stored with comments.", error);
    }
  }

  return rows.map(
    (row): CommunityComment => {
      const profile = row.user_id ? profilesById.get(row.user_id) : undefined;
      return {
        id: row.id,
        name: profile?.full_name?.trim() || profile?.username?.trim() || row.name,
        text: row.text,
        time: row.created_at || row.time_text,
        userId: row.user_id ?? undefined,
        avatarUrl: profile?.avatar_url || undefined,
      };
    },
  );
}

export async function setRemoteCommunityLike(
  postId: string,
  liked: boolean,
  expectedUserId?: string,
): Promise<void> {
  const auth = await requireCommunityAuth(expectedUserId);

  if (isSampleId(postId)) {
    return;
  }

  if (liked) {
    await supabaseRequest(
      "/rest/v1/community_post_likes?on_conflict=post_id,user_id",
      {
        method: "POST",
        accessToken: auth.accessToken,
        expectedUserId: auth.userId,
        headers: {
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: [
          {
            post_id: postId,
            user_id: auth.userId,
          },
        ],
      },
    );
  } else {
    await supabaseRequest(
      `/rest/v1/community_post_likes?post_id=eq.${encodeURIComponent(
        postId,
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
  }
}

export async function setRemoteCommunitySave(
  postId: string,
  saved: boolean,
  expectedUserId?: string,
): Promise<void> {
  const auth = await requireCommunityAuth(expectedUserId);

  if (isSampleId(postId)) {
    return;
  }

  if (saved) {
    await supabaseRequest(
      "/rest/v1/community_post_saves?on_conflict=post_id,user_id",
      {
        method: "POST",
        accessToken: auth.accessToken,
        expectedUserId: auth.userId,
        headers: {
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: [
          {
            post_id: postId,
            user_id: auth.userId,
          },
        ],
      },
    );
  } else {
    await supabaseRequest(
      `/rest/v1/community_post_saves?post_id=eq.${encodeURIComponent(
        postId,
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
  }
}

export async function uploadCommunityComment(
  postId: string,
  comment: CommunityComment,
  expectedUserId?: string,
): Promise<void> {
  const auth = await requireCommunityAuth(expectedUserId);

  if (isSampleId(postId)) {
    throw new Error("Không đồng bộ bình luận dữ liệu mẫu Community.");
  }

  await supabaseRequest("/rest/v1/community_comments?on_conflict=id", {
    method: "POST",
    accessToken: auth.accessToken,
    expectedUserId: auth.userId,
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: [
      {
        id: comment.id,
        post_id: postId,
        user_id: auth.userId,
        name: comment.name,
        text: comment.text,
        time_text: comment.time,
      },
    ],
  });
}
