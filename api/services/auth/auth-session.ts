import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../core/supabase-base';

/**
 * Session adapter for services ported from TrekkEZ classic.
 * Uses the already-installed supabase-js dependency and AsyncStorage.
 * The React Native frontend must explicitly call these functions; importing
 * this file does NOT install UI hooks or alter screens.
 */
export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  userId: string | null;
  email: string | null;
};

type RemoteSession = {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number;
  expires_in?: number;
  user?: { id?: string; email?: string | null };
};

function normalizeSession(session: RemoteSession | null): StoredAuthSession | null {
  if (!session?.access_token) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    expiresAt: session.expires_at ?? null,
    userId: session.user?.id || null,
    email: session.user?.email || null,
  };
}

export async function getAuthSession(): Promise<StoredAuthSession | null> {
  const { data, error } = await authClient.auth.getSession();
  if (error) throw error;
  return normalizeSession(data.session);
}

/** Persist a session returned by Supabase REST OAuth/password endpoints. */
export async function saveAuthSession(session: RemoteSession): Promise<StoredAuthSession> {
  if (!session?.access_token || !session?.refresh_token) {
    throw new Error('Cần access_token và refresh_token để lưu phiên đăng nhập.');
  }
  const { data, error } = await authClient.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  const normalized = normalizeSession(data.session);
  if (!normalized) throw new Error('Không thể khôi phục phiên đăng nhập.');
  return normalized;
}

export async function forceRefreshAuthSession(
  failedAccessToken?: string,
): Promise<StoredAuthSession | null> {
  const before = await getAuthSession();
  if (!before) return null;
  if (failedAccessToken && before.accessToken !== failedAccessToken) return before;
  if (!before.refreshToken) return before;
  const { data, error } = await authClient.auth.refreshSession();
  if (error) {
    // A failed refresh does not automatically imply logout: may be offline.
    return getAuthSession();
  }
  if (before.userId && data.session?.user?.id !== before.userId) {
    throw new Error('Refresh session trả về tài khoản không trùng khớp.');
  }
  return normalizeSession(data.session);
}

export async function clearAuthSession(): Promise<void> {
  const { error } = await authClient.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<StoredAuthSession> {
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const session = normalizeSession(data.session);
  if (!session) throw new Error('Đăng nhập không trả về session.');
  return session;
}

/** Only accepts a Google ID token obtained by a separately configured OAuth flow. */
export async function signInWithGoogleToken(idToken: string): Promise<StoredAuthSession> {
  const { data, error } = await authClient.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  const session = normalizeSession(data.session);
  if (!session) throw new Error('Google không trả về session.');
  return session;
}
