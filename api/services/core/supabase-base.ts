const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const SUPABASE_URL: string = supabaseUrl;
export const SUPABASE_ANON_KEY: string = supabaseAnonKey;

export type SupabaseRawRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  accessToken?: string;
  serializeJson?: boolean;
};

export async function readSupabaseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getSupabaseErrorMessage(data: any, status: number) {
  if (typeof data === "string") {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.error_description) {
    return data.error_description;
  }

  if (data?.msg) {
    return data.msg;
  }

  if (data?.error) {
    return data.error;
  }

  return `HTTP ${status}`;
}

export async function rawSupabaseRequest(
  path: string,
  options: SupabaseRawRequestOptions = {},
): Promise<{ response: Response; data: any }> {
  const serializeJson = options.serializeJson !== false;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${options.accessToken || SUPABASE_ANON_KEY}`,
    ...options.headers,
  };

  if (!headers["Content-Type"] && serializeJson) {
    headers["Content-Type"] = "application/json";
  }

  let body: any = undefined;

  if (options.body !== undefined) {
    if (!serializeJson || typeof options.body === "string") {
      body = options.body as any;
    } else {
      body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });

  const data = await readSupabaseResponse(response);

  return {
    response,
    data,
  };
}

export async function supabaseRequestWithoutAuthRetry(
  path: string,
  options: SupabaseRawRequestOptions = {},
) {
  const result = await rawSupabaseRequest(path, options);

  if (!result.response.ok) {
    throw new Error(
      getSupabaseErrorMessage(result.data, result.response.status),
    );
  }

  return result.data;
}

export async function refreshSupabaseSession(refreshToken: string) {
  if (!refreshToken) {
    throw new Error("Không có refresh token.");
  }

  return supabaseRequestWithoutAuthRetry(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      body: {
        refresh_token: refreshToken,
      },
    },
  );
}
