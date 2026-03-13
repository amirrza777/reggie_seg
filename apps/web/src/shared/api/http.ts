import { API_BASE_URL } from "./env";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/features/auth/api/session";
import { ApiError } from "./errors";

type FetchOptions = RequestInit & {
  parse?: "json" | "text";
  auth?: boolean;
  baseUrl?: string;
  retryOn401?: boolean;
};

function hasHeader(headers: HeadersInit | undefined, name: string) {
  if (!headers) return false;
  const lowerName = name.toLowerCase();

  if (headers instanceof Headers) {
    return headers.has(name);
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === lowerName);
  }

  return Object.keys(headers).some((key) => key.toLowerCase() === lowerName);
}

async function getServerAuthHeaders(headers: HeadersInit | undefined): Promise<Record<string, string>> {
  if (typeof window !== "undefined") {
    return {};
  }

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const accessToken = cookieStore.get("tf_access_token")?.value?.trim() || null;

    const authHeaders: Record<string, string> = {};
    if (!hasHeader(headers, "Authorization") && accessToken) {
      authHeaders.Authorization = `Bearer ${accessToken}`;
    }
    if (!hasHeader(headers, "Cookie") && cookieHeader) {
      authHeaders.Cookie = cookieHeader;
    }

    return authHeaders;
  } catch {
    return {};
  }
}

export async function apiFetch<T = unknown>(path: string, init: FetchOptions = {}): Promise<T> {
  const { parse = "json", headers, auth = true, baseUrl, retryOn401 = true, ...rest } = init;
  const token = auth ? getAccessToken() : null;
  const serverAuthHeaders = auth ? await getServerAuthHeaders(headers) : {};
  const requestUrl = `${baseUrl ?? API_BASE_URL}${path}`;
  const res = await fetch(requestUrl, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...serverAuthHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (
    res.status === 401 &&
    auth &&
    retryOn401 &&
    path !== "/auth/refresh" &&
    !path.startsWith("/auth/")
  ) {
    const refreshedToken = await tryRefreshAccessToken(baseUrl);
    if (refreshedToken) {
      return apiFetch<T>(path, { ...init, retryOn401: false });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let friendly = text;
    try {
      const parsed = JSON.parse(text);
      friendly = parsed.error || parsed.message || text;
    } catch {
      // keep text
    }
    throw new ApiError(friendly || `Request failed with ${res.status}`, { status: res.status, details: text });
  }

  if (parse === "text") return (await res.text()) as T;
  return (await res.json()) as T;
}

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefreshAccessToken(baseUrl?: string): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshUrl = `${baseUrl ?? API_BASE_URL}/auth/refresh`;
  refreshInFlight = (async () => {
    try {
      const refreshRes = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!refreshRes.ok) {
        clearAccessToken();
        return null;
      }

      const data = (await refreshRes.json()) as { accessToken?: string };
      if (!data.accessToken) {
        clearAccessToken();
        return null;
      }

      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
