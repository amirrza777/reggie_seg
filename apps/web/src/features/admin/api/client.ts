import { apiFetch } from "@/shared/api/http";
import type { FeatureFlag } from "../types";

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return apiFetch<FeatureFlag[]>("/admin/feature-flags");
}
