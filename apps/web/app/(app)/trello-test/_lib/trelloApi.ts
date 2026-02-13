import { refreshAccessToken } from "@/features/auth/api/client";
import { ApiError } from "@/shared/api/errors";
import { apiFetch } from "@/shared/api/http";

type ApiFetchInit = Parameters<typeof apiFetch>[1];

export async function trelloApiFetch<T = unknown>(path: string, init?: ApiFetchInit): Promise<T> {
  try {
    return await apiFetch<T>(path, init);
  } catch (err) {
    //Trello test pages should survive access-token expiry without manual relogin.
    if (err instanceof ApiError && err.status === 401) {
      const token = await refreshAccessToken();
      if (token) {
        return await apiFetch<T>(path, init);
      }
    }
    throw err;
  }
}
