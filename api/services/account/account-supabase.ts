import { SUPABASE_URL } from "../core/supabase-base";
import {
  supabaseRequest,
  uploadSupabaseStorageFile,
} from "../core/supabase-client";

export type SupabaseProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  role: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UpdateSupabaseProfileInput = {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
};

export function getGoogleAuthorizeUrl(redirectTo: string) {
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo,
  });

  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
}

export async function signInWithGoogleIdToken(idToken: string) {
  if (!idToken) {
    throw new Error("Google không trả về ID Token.");
  }

  return supabaseRequest("/auth/v1/token?grant_type=id_token", {
    method: "POST",
    body: {
      provider: "google",
      id_token: idToken,
    },
  });
}

export async function signInWithPassword(email: string, password: string) {
  return supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export async function getCurrentUser(accessToken: string) {
  return supabaseRequest("/auth/v1/user", {
    accessToken,
  });
}

export async function signOut(accessToken: string) {
  if (!accessToken) {
    throw new Error("Không có access token.");
  }

  return supabaseRequest("/auth/v1/logout", {
    method: "POST",
    accessToken,
  });
}

export async function getProfileById(
  accessToken: string,
  userId: string,
): Promise<SupabaseProfile | null> {
  if (!userId) {
    throw new Error("Không có user ID.");
  }

  const profiles = await supabaseRequest(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(
      userId,
    )}&select=id,username,full_name,avatar_url,bio,phone,role,created_at,updated_at&limit=1`,
    {
      accessToken,
      expectedUserId: userId,
    },
  );

  if (!Array.isArray(profiles) || profiles.length === 0) {
    return null;
  }

  return profiles[0] as SupabaseProfile;
}

export async function updateProfile(
  accessToken: string,
  userId: string,
  values: UpdateSupabaseProfileInput,
): Promise<SupabaseProfile | null> {
  if (!accessToken) {
    throw new Error("Không có access token.");
  }

  if (!userId) {
    throw new Error("Không có user ID.");
  }

  await supabaseRequest(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: values,
      accessToken,
      expectedUserId: userId,
    },
  );

  return getProfileById(accessToken, userId);
}

function normalizeAvatarMimeType(mimeType?: string | null) {
  if (mimeType === "image/png") {
    return "image/png";
  }

  if (mimeType === "image/webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function getAvatarExtension(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export async function uploadAvatar(
  accessToken: string,
  userId: string,
  fileUri: string,
  mimeType?: string | null,
): Promise<string> {
  if (!accessToken) {
    throw new Error("Không có access token.");
  }

  if (!userId) {
    throw new Error("Không có user ID.");
  }

  if (!fileUri) {
    throw new Error("Không có ảnh để upload.");
  }

  const cleanMimeType = normalizeAvatarMimeType(mimeType);
  const extension = getAvatarExtension(cleanMimeType);
  const objectPath = `${userId}/avatar-${Date.now()}.${extension}`;

  console.log("AVATAR: uploading...", {
    path: objectPath,
    type: cleanMimeType,
  });

  const publicUrl = await uploadSupabaseStorageFile({
    bucket: "avatars",
    objectPath,
    fileUri,
    contentType: cleanMimeType,
    accessToken,
    expectedUserId: userId,
    upsert: false,
    readErrorMessage: "Không đọc được ảnh trên thiết bị.",
  });

  console.log("AVATAR: upload PASS", {
    path: objectPath,
    publicUrl,
  });

  return publicUrl;
}
