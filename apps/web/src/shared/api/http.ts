import { API_BASE_URL } from "./env";
import { ApiError } from "./errors";

type FetchOptions = RequestInit & { parse?: "json" | "text" };

export async function apiFetch<T = unknown>(path: string, init: FetchOptions = {}): Promise<T> {
  const { parse = "json", headers, ...rest } = init;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let friendly = text;
    try {
      const parsed = JSON.parse(text);
      friendly = parsed.error || parsed.message || text;
    } catch (_) {
      // keep text
    }
    throw new ApiError(friendly || `Request failed with ${res.status}`, { status: res.status, details: text });
  }

  if (parse === "text") return (await res.text()) as T;
  return (await res.json()) as T;
}
