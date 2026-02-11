import { API_BASE_URL } from "./env";
import { getAccessToken } from "@/features/auth/api/session";
import { ApiError } from "./errors";

type FetchOptions = RequestInit & { parse?: "json" | "text"; auth?: boolean };

export async function apiFetch<T = unknown>(path: string, init: FetchOptions = {}): Promise<T> {
  const { parse = "json", headers, auth = true, ...rest } = init;
  const token = auth ? getAccessToken() : null;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

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
