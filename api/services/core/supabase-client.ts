import {
  SUPABASE_URL,
  getSupabaseErrorMessage,
  rawSupabaseRequest,
  type SupabaseRawRequestOptions,
} from "./supabase-base";

export type SupabaseRequestOptions = SupabaseRawRequestOptions & {
  expectedUserId?: string | null;
};

export async function supabaseRequest(
  path: string,
  options: SupabaseRequestOptions = {},
) {
  let result = await rawSupabaseRequest(path, options);

  if (result.response.status === 401 && options.accessToken) {
    const { getAuthSession, forceRefreshAuthSession } = await import(
      "../auth/auth-session"
    );

    const current = await getAuthSession();

    const canRecover = options.expectedUserId
      ? current?.userId === options.expectedUserId
      : current?.accessToken === options.accessToken;

    if (canRecover) {
      const refreshed = await forceRefreshAuthSession(options.accessToken);

      const sameUser = options.expectedUserId
        ? refreshed?.userId === options.expectedUserId
        : true;

      if (
        refreshed?.accessToken &&
        refreshed.accessToken !== options.accessToken &&
        sameUser
      ) {
        result = await rawSupabaseRequest(path, {
          ...options,
          accessToken: refreshed.accessToken,
        });
      }
    }
  }

  if (!result.response.ok) {
    throw new Error(
      getSupabaseErrorMessage(result.data, result.response.status),
    );
  }

  return result.data;
}

export async function getAllSupabaseRows<T>(
  path: string,
  options: {
    accessToken: string;
    expectedUserId?: string | null;
    pageSize?: number;
  },
): Promise<T[]> {
  const pageSize = options.pageSize ?? 1000;
  let offset = 0;
  const allRows: T[] = [];

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const data = await supabaseRequest(
      `${path}${separator}limit=${pageSize}&offset=${offset}`,
      {
        accessToken: options.accessToken,
        expectedUserId: options.expectedUserId,
      },
    );

    const rows = Array.isArray(data) ? (data as T[]) : [];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allRows;
}

export async function uploadSupabaseStorageFile(options: {
  bucket: string;
  objectPath: string;
  fileUri: string;
  contentType: string;
  accessToken: string;
  expectedUserId: string;
  upsert?: boolean;
  readErrorMessage?: string;
}): Promise<string> {
  const localResponse = await fetch(options.fileUri);

  if (!localResponse.ok) {
    throw new Error(options.readErrorMessage || "Không đọc được file trên thiết bị.");
  }

  const arrayBuffer = await localResponse.arrayBuffer();
  const encodedPath = options.objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  await supabaseRequest(
    `/storage/v1/object/${encodeURIComponent(options.bucket)}/${encodedPath}`,
    {
      method: "POST",
      accessToken: options.accessToken,
      expectedUserId: options.expectedUserId,
      serializeJson: false,
      headers: {
        "Content-Type": options.contentType,
        "x-upsert": options.upsert ? "true" : "false",
      },
      body: arrayBuffer as any,
    },
  );

  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(
    options.bucket,
  )}/${encodedPath}`;
}
