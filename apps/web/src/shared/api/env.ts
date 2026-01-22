const FALLBACK_API = "http://localhost:3000";

export function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  return FALLBACK_API;
}

export const API_BASE_URL = getApiBaseUrl();
