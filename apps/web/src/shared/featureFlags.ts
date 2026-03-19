import { unstable_noStore as noStore } from "next/cache";
import { API_BASE_URL } from "./api/env";
import { ApiError } from "./api/errors";
import { apiFetch } from "./api/http";
import type { EnterpriseFeatureFlag } from "@/features/enterprise/types";

async function getFeatureFlags(): Promise<EnterpriseFeatureFlag[]> {
  noStore();
  try {
    return await apiFetch<EnterpriseFeatureFlag[]>("/feature-flags", {
      baseUrl: API_BASE_URL,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return [];
    throw err;
  }
}

export async function getFeatureFlagMap(): Promise<Record<string, boolean>> {
  const flags = await getFeatureFlags();
  return flags.reduce<Record<string, boolean>>((acc, flag) => {
    acc[flag.key] = flag.enabled;
    return acc;
  }, {});
}
