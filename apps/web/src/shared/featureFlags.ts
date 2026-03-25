import { unstable_noStore as noStore } from "next/cache";
import { API_BASE_URL } from "./api/env";
import { ApiError } from "./api/errors";
import { apiFetch } from "./api/http";
import { logDevError } from "./lib/devLogger";
import type { EnterpriseFeatureFlag } from "@/features/enterprise/types";

type ErrorWithCause = Error & { cause?: unknown; code?: string };

function isNetworkFetchFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name !== "TypeError") return false;
  if (err.message.toLowerCase() !== "fetch failed") return false;

  const code = (err as ErrorWithCause).code;
  const causeCode =
    typeof (err as ErrorWithCause).cause === "object" && (err as ErrorWithCause).cause !== null
      ? (err as { cause: { code?: unknown } }).cause.code
      : undefined;

  const normalizedCode = typeof code === "string" ? code : typeof causeCode === "string" ? causeCode : null;
  if (!normalizedCode) return true;

  return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"].includes(
    normalizedCode,
  );
}

async function getFeatureFlags(): Promise<EnterpriseFeatureFlag[]> {
  noStore();
  try {
    return await apiFetch<EnterpriseFeatureFlag[]>("/feature-flags", {
      baseUrl: API_BASE_URL,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return [];
    if (isNetworkFetchFailure(err)) {
      logDevError("Feature flags unavailable; defaulting to empty map in non-production environments.", err);
      if (process.env.NODE_ENV !== "production") return [];
    }
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
