import { getAuthSession } from "../auth/auth-session";
import { supabaseRequest } from "../core/supabase-client";

export type PublicUserProfile = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

type RemotePublicProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number | string | null;
  following_count: number | string | null;
  is_following: boolean | null;
};

type FollowListener = (following: boolean) => void;

type ProfileCacheEntry = {
  profile: PublicUserProfile;
  expiresAt: number;
};

const PROFILE_CACHE_TTL = 5 * 60 * 1000;

const followListeners = new Map<string, Set<FollowListener>>();

const profileCache = new Map<string, ProfileCacheEntry>();

const profilePromises = new Map<string, Promise<PublicUserProfile | null>>();

/*
 * Dùng để đảm bảo cache trong RAM
 * không bị giữ lại giữa account A/B.
 */
let activeViewerId: string | null = null;

let viewerGeneration = 0;

async function requireSocialAuth(): Promise<{
  accessToken: string;
  userId: string;
}> {
  const auth = await getAuthSession();

  if (!auth?.accessToken || !auth?.userId) {
    throw new Error("Bạn cần đăng nhập để sử dụng tính năng này.");
  }

  ensureViewerScope(auth.userId);

  return {
    accessToken: auth.accessToken,

    userId: auth.userId,
  };
}

function ensureViewerScope(userId: string) {
  if (activeViewerId === userId) {
    return;
  }

  activeViewerId = userId;

  viewerGeneration += 1;

  /*
   * isFollowing phụ thuộc người đang xem.
   * Khi đổi account phải bỏ toàn bộ cache cũ.
   */
  profileCache.clear();

  profilePromises.clear();
}

function getCacheKey(viewerUserId: string, profileUserId: string) {
  return `${viewerUserId}:${profileUserId}`;
}

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function readCachedProfile(cacheKey: string): PublicUserProfile | null {
  const cached = profileCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    profileCache.delete(cacheKey);

    return null;
  }

  return cached.profile;
}

function writeCachedProfile(cacheKey: string, profile: PublicUserProfile) {
  profileCache.set(cacheKey, {
    profile,

    expiresAt: Date.now() + PROFILE_CACHE_TTL,
  });
}

function patchCachedProfile(
  cacheKey: string,
  patch: (current: PublicUserProfile) => PublicUserProfile,
) {
  const cached = profileCache.get(cacheKey);

  if (!cached) {
    return;
  }

  writeCachedProfile(cacheKey, patch(cached.profile));
}

function emitFollow(userId: string, following: boolean) {
  const listeners = followListeners.get(userId);

  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    try {
      listener(following);
    } catch (error) {
      console.log("SOCIAL FOLLOW LISTENER: failed", {
        userId,

        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function subscribeUserFollow(
  userId: string,
  listener: FollowListener,
): () => void {
  if (!userId) {
    return () => undefined;
  }

  const listeners = followListeners.get(userId) ?? new Set<FollowListener>();

  listeners.add(listener);

  followListeners.set(userId, listeners);

  return () => {
    const current = followListeners.get(userId);

    if (!current) {
      return;
    }

    current.delete(listener);

    if (current.size === 0) {
      followListeners.delete(userId);
    }
  };
}

export function invalidatePublicProfileCache(userId?: string) {
  if (!userId) {
    profileCache.clear();

    profilePromises.clear();

    return;
  }

  for (const key of Array.from(profileCache.keys())) {
    if (key.endsWith(`:${userId}`)) {
      profileCache.delete(key);
    }
  }

  for (const key of Array.from(profilePromises.keys())) {
    if (key.endsWith(`:${userId}`)) {
      profilePromises.delete(key);
    }
  }
}

export async function getPublicProfile(
  userId: string,
  force = false,
): Promise<PublicUserProfile | null> {
  if (!userId) {
    return null;
  }

  const auth = await requireSocialAuth();

  const cacheKey = getCacheKey(auth.userId, userId);

  /*
   * Request đang chạy luôn được dùng chung,
   * kể cả caller gọi force=true.
   *
   * force chỉ có nghĩa:
   * bỏ qua cache đã hoàn thành.
   */
  const existing = profilePromises.get(cacheKey);

  if (existing) {
    return existing;
  }

  if (!force) {
    const cached = readCachedProfile(cacheKey);

    if (cached) {
      return cached;
    }
  }

  const generation = viewerGeneration;

  const task = (async () => {
    const data = await supabaseRequest("/rest/v1/rpc/get_public_profile", {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      body: {
        p_user_id: userId,
      },
    });

    const rows = Array.isArray(data)
      ? (data as RemotePublicProfile[])
      : data && typeof data === "object"
        ? [data as RemotePublicProfile]
        : [];

    const row = rows[0];

    if (!row) {
      return null;
    }

    const profile: PublicUserProfile = {
      id: row.id,

      username: row.username ?? "",

      fullName: row.full_name ?? row.username ?? "Người dùng TrekkEZ",

      avatarUrl: row.avatar_url ?? "",

      bio: row.bio ?? "",

      followerCount: toCount(row.follower_count),

      followingCount: toCount(row.following_count),

      isFollowing: Boolean(row.is_following),
    };

    /*
     * Account có thể đã đổi
     * trong lúc request đang chạy.
     * Khi đó tuyệt đối không ghi
     * kết quả của account cũ vào cache mới.
     */
    if (activeViewerId === auth.userId && viewerGeneration === generation) {
      writeCachedProfile(cacheKey, profile);
    }

    return profile;
  })().finally(() => {
    if (profilePromises.get(cacheKey) === task) {
      profilePromises.delete(cacheKey);
    }
  });

  profilePromises.set(cacheKey, task);

  return task;
}

export async function setUserFollowing(
  followingUserId: string,
  following: boolean,
): Promise<void> {
  const auth = await requireSocialAuth();

  if (!followingUserId) {
    throw new Error("Không tìm thấy người dùng.");
  }

  if (followingUserId === auth.userId) {
    throw new Error("Bạn không thể tự theo dõi chính mình.");
  }

  const targetCacheKey = getCacheKey(auth.userId, followingUserId);

  const ownCacheKey = getCacheKey(auth.userId, auth.userId);

  const cachedTarget = profileCache.get(targetCacheKey)?.profile;

  /*
   * Ghi nhận state cũ trước request.
   *
   * Nếu cache đã biết B đang được Follow
   * mà caller lại gửi Follow lần nữa,
   * backend sẽ ignore duplicate và count
   * local cũng không được +1 lần nữa.
   */
  const previousFollowing = cachedTarget?.isFollowing;

  if (following) {
    await supabaseRequest(
      "/rest/v1/user_follows?on_conflict=follower_id,following_id",
      {
        method: "POST",

        accessToken: auth.accessToken,

        expectedUserId: auth.userId,

        headers: {
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },

        body: [
          {
            follower_id: auth.userId,

            following_id: followingUserId,
          },
        ],
      },
    );
  } else {
    await supabaseRequest(
      `/rest/v1/user_follows?follower_id=eq.${encodeURIComponent(
        auth.userId,
      )}&following_id=eq.${encodeURIComponent(followingUserId)}`,
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

  const stateChanged =
    previousFollowing === undefined || previousFollowing !== following;

  patchCachedProfile(
    targetCacheKey,

    (current) => ({
      ...current,

      isFollowing: following,

      followerCount: stateChanged
        ? Math.max(
            0,

            current.followerCount + (following ? 1 : -1),
          )
        : current.followerCount,
    }),
  );

  /*
   * Nếu profile của chính viewer
   * đang nằm trong cache thì cập nhật
   * luôn số "Đang theo dõi".
   */
  if (stateChanged) {
    patchCachedProfile(
      ownCacheKey,

      (current) => ({
        ...current,

        followingCount: Math.max(
          0,

          current.followingCount + (following ? 1 : -1),
        ),
      }),
    );
  }

  emitFollow(followingUserId, following);
}

export type SocialConnection = {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  isFollowing: boolean;
};

type RemoteSocialConnection = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_following: boolean | null;
};

export async function getUserFollowConnections(
  userId: string,
  mode: "followers" | "following",
): Promise<SocialConnection[]> {
  if (!userId) {
    return [];
  }

  const auth = await requireSocialAuth();

  const data = await supabaseRequest(
    "/rest/v1/rpc/get_user_follow_connections",
    {
      method: "POST",

      accessToken: auth.accessToken,

      expectedUserId: auth.userId,

      body: {
        p_user_id: userId,

        p_mode: mode,
      },
    },
  );

  const rows = Array.isArray(data) ? (data as RemoteSocialConnection[]) : [];

  const result = rows.map((row) => ({
    userId: row.user_id,

    username: row.username ?? "",

    fullName: row.full_name ?? row.username ?? "Người dùng TrekkEZ",

    avatarUrl: row.avatar_url ?? "",

    isFollowing: Boolean(row.is_following),
  }));

  /*
   * Nếu profile nào đã có trong cache,
   * đồng bộ isFollowing từ RPC list mới nhất.
   *
   * Không tạo profile cache mới ở đây vì
   * RPC connections không trả bio/count đầy đủ.
   */
  for (const item of result) {
    const cacheKey = getCacheKey(auth.userId, item.userId);

    patchCachedProfile(
      cacheKey,

      (current) => ({
        ...current,

        username: item.username || current.username,

        fullName: item.fullName || current.fullName,

        avatarUrl: item.avatarUrl || current.avatarUrl,

        isFollowing: item.isFollowing,
      }),
    );
  }

  return result;
}
