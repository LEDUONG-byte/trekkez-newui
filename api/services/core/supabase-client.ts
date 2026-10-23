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
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new RangeError("pageSize phải là số nguyên từ 1 đến 1000.");
  }

  const queryIndex = path.indexOf("?");
  const resource = queryIndex < 0 ? path : path.slice(0, queryIndex);
  const query = queryIndex < 0 ? "" : path.slice(queryIndex + 1);
  const params = new URLSearchParams(query);
  params.set("limit", String(pageSize));

  let offset = 0;
  const allRows: T[] = [];

  while (true) {
    params.set("offset", String(offset));
    const data = await supabaseRequest(`${resource}?${params.toString()}`, {
      accessToken: options.accessToken,
      expectedUserId: options.expectedUserId,
    });

    if (!Array.isArray(data)) {
      throw new Error("Supabase trả về dữ liệu phân trang không đúng định dạng danh sách.");
    }

    const rows = data as T[];
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
