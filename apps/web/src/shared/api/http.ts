import { API_BASE_URL } from "./env";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/features/auth/api/session";
import { ApiError } from "./errors";

type FetchOptions = RequestInit & {
  parse?: "json" | "text";
  auth?: boolean;
  baseUrl?: string;
  retryOn401?: boolean;
};

type InternalFetchOptions = FetchOptions & {
  authTokenOverride?: string | null;
  serverCookieOverride?: string | null;
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

function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  const lowerName = name.toLowerCase();

  if (headers instanceof Headers) {
    return headers.get(name);
  }

  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === lowerName);
    return found?.[1] ?? null;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lowerName) continue;
    if (Array.isArray(value)) return value.join(", ");
    return value ?? null;
  }

  return null;
}

function mergeHeaders(...parts: Array<HeadersInit | undefined>): Headers {
  const merged = new Headers();
  for (const part of parts) {
    if (!part) continue;
    const current = part instanceof Headers ? part : new Headers(part);
    current.forEach((value, key) => {
      merged.set(key, value);
    });
  }
  return merged;
}

async function getServerAuthHeaders(
  headers: HeadersInit | undefined,
): Promise<{ authHeaders: Record<string, string>; cookieHeader: string | null }> {
  if (typeof window !== "undefined") {
    return { authHeaders: {}, cookieHeader: null };
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

    return { authHeaders, cookieHeader: cookieHeader || null };
  } catch {
    return { authHeaders: {}, cookieHeader: null };
  }
}

export async function apiFetch<T = unknown>(path: string, init: InternalFetchOptions = {}): Promise<T> {
  const {
    parse = "json",
    headers,
    auth = true,
    baseUrl,
    retryOn401 = true,
    authTokenOverride,
    serverCookieOverride,
    ...rest
  } = init;
  const token = auth ? authTokenOverride ?? getAccessToken() : null;
  const serverAuth = auth ? await getServerAuthHeaders(headers) : { authHeaders: {}, cookieHeader: null };
  const finalHeaders = mergeHeaders(
    { "Content-Type": "application/json" },
    serverAuth.authHeaders,
    token ? { Authorization: `Bearer ${token}` } : undefined,
    headers,
  );
  const requestUrl = `${baseUrl ?? API_BASE_URL}${path}`;
  const res = await fetch(requestUrl, {
    ...rest,
    credentials: "include",
    headers: finalHeaders,
  });

  if (
    res.status === 401 &&
    auth &&
    retryOn401 &&
    path !== "/auth/refresh" &&
    !path.startsWith("/auth/")
  ) {
    const requestCookieHeader =
      serverCookieOverride ??
      readHeader(finalHeaders, "Cookie") ??
      readHeader(headers, "Cookie") ??
      serverAuth.cookieHeader;
    const refreshedToken = await tryRefreshAccessToken(baseUrl, requestCookieHeader);
    if (refreshedToken) {
      return apiFetch<T>(path, {
        ...init,
        retryOn401: false,
        authTokenOverride: refreshedToken,
        serverCookieOverride: requestCookieHeader,
      });
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

async function tryRefreshAccessToken(baseUrl?: string, cookieHeader?: string | null): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshUrl = `${baseUrl ?? API_BASE_URL}/auth/refresh`;
  const refreshHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (cookieHeader) {
    (refreshHeaders as Record<string, string>).Cookie = cookieHeader;
  }

  refreshInFlight = (async () => {
    try {
      const refreshRes = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: refreshHeaders,
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

export const __httpInternals = {
  hasHeader,
  readHeader,
  mergeHeaders,
  getServerAuthHeaders,
};
