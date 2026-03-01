import { API_BASE_URL } from "./api/env";
import { apiFetch } from "./api/http";
import type { FeatureFlag } from "@/features/admin/types";

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  return apiFetch<FeatureFlag[]>("/feature-flags", { baseUrl: API_BASE_URL, auth: false, cache: "no-store" as RequestCache });
}

export async function getFeatureFlagMap(): Promise<Record<string, boolean>> {
  const flags = await getFeatureFlags();
  return flags.reduce<Record<string, boolean>>((acc, flag) => {
    acc[flag.key] = flag.enabled;
    return acc;
  }, {});
}

export async function ensureFeatureEnabled(key: string): Promise<Record<string, boolean>> {
  const map = await getFeatureFlagMap();
  if (!map[key]) {
    map[key] = false;
  }
  return map;
}