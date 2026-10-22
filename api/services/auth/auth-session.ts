import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import * as ExpoLinking from 'expo-linking';
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
    flowType: 'pkce',
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

/**
 * Start Google via Supabase's hosted OAuth endpoint (PKCE).
 * No Google secret or ID token is embedded in this client.
 * The redirect MUST be allowlisted in Supabase Auth URL Configuration.
 */
export async function beginGoogleOAuth(): Promise<void> {
  const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/login`
    : ExpoLinking.createURL('/login');
  const { data, error } = await authClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Supabase không trả về địa chỉ Google OAuth.');
  await Linking.openURL(data.url);
}

/** Handle callback only after user returns from Google. */
export async function finishGoogleOAuth(callbackUrl: string): Promise<StoredAuthSession | null> {
  const queryPart = callbackUrl.split('?')[1]?.split('#')[0] || '';
  const fragmentPart = callbackUrl.split('#')[1] || '';
  const parse = (input: string) => new URLSearchParams(input);
  const query = parse(queryPart);
  const hash = parse(fragmentPart);
  const description = query.get('error_description') || hash.get('error_description');
  if (query.has('error') || hash.has('error')) {
    throw new Error(description || query.get('error') || hash.get('error') || 'Google OAuth thất bại.');
  }
  const code = query.get('code') || hash.get('code');
  if (!code) return null;
  const { data, error } = await authClient.auth.exchangeCodeForSession(code);
  if (error) throw error;
  const session = normalizeSession(data.session);
  if (!session?.userId) throw new Error('Google OAuth không trả về phiên đăng nhập hợp lệ.');
  return session;
}
