const FALLBACK_API = "http://localhost:3000";

const isLoopback = (host?: string | null) =>
  Boolean(host && (host === "localhost" || host === "127.0.0.1" || host.startsWith("127.") || host === "::1"));

function safeHost(url?: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (isLoopback(hostname)) {
      const envHost = safeHost(fromEnv);
      if (!fromEnv || (envHost && envHost !== hostname && isLoopback(envHost))) {
        return `${protocol}//${hostname}:3000`;
      }
    }
  }

  return fromEnv || FALLBACK_API;
}

export function getApiBaseForRequest(hostHeader?: string | null, protoHeader?: string | null) {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const hostname = hostHeader?.split(":")[0];
  const proto = protoHeader || "http";

  if (hostname && isLoopback(hostname)) {
    const envHost = safeHost(fromEnv);
    if (!fromEnv || (envHost && envHost !== hostname && isLoopback(envHost))) {
      return `${proto}://${hostname}:3000`;
    }
  }

  return fromEnv || FALLBACK_API;
}

export const API_BASE_URL = getApiBaseUrl();
