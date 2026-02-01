import { API_BASE_URL } from "./env";
import { ApiError } from "./errors";

type FetchOptions = RequestInit & { parse?: "json" | "text" };

export async function apiFetch<T = unknown>(path: string, init: FetchOptions = {}): Promise<T> {
  const { parse = "json", headers, ...rest } = init;
  console.log("API_BASE_URL:", API_BASE_URL);
  console.log("PATH:", path);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(`Request failed with ${res.status}`, { status: res.status, details: body });
  }

  if (parse === "text") return (await res.text()) as T;
  return (await res.json()) as T;
}
