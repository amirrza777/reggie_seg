'use client';

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { UserProvider } from "@/features/auth/context";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useManualScrollRestoration();
  useBuildChangeCacheReset();
  useDevCacheReset(pathname);
  useProfileRouteBodyClass(pathname);

  // Add things like QueryClientProvider/ThemeProvider here later.
  return <UserProvider>{children}</UserProvider>;
}

function useManualScrollRestoration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = originalScrollRestoration;
    };
  }, []);
}

function isDevelopmentBrowser() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "development";
}

function useBuildChangeCacheReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentBuildId = getCurrentBuildId();
    const previousBuildId = safeStorageGet(window.localStorage, "tf_last_build_id");
    safeStorageSet(window.localStorage, "tf_last_build_id", currentBuildId);

    if (!previousBuildId || previousBuildId === currentBuildId) return;

    const cacheResetKey = `tf_cache_reset_for_build_${currentBuildId}`;
    if (safeStorageGet(window.sessionStorage, cacheResetKey) === "done") return;

    safeStorageSet(window.sessionStorage, cacheResetKey, "done");
    void clearCachesAndReload();
  }, []);
}

function useDevCacheReset(pathname: string | null) {
  useEffect(() => {
    if (!isDevelopmentBrowser()) return;
    if (!shouldRunDevCacheCheck()) return;
    void clearCachesAndReload();
  }, [pathname]);
}

function useProfileRouteBodyClass(pathname: string | null) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const isProfileRoute = pathname === "/profile" || pathname?.startsWith("/profile/") === true;
    document.body.classList.toggle("profile-route", isProfileRoute);
    return () => {
      document.body.classList.remove("profile-route");
    };
  }, [pathname]);
}

function shouldRunDevCacheCheck() {
  const checkIntervalMs = 30_000;
  const checkKey = "tf_dev_cache_check_at";
  const now = Date.now();
  const lastCheckAt = Number(safeStorageGet(window.sessionStorage, checkKey) ?? "0");
  if (Number.isFinite(lastCheckAt) && now - lastCheckAt < checkIntervalMs) {
    return false;
  }
  safeStorageSet(window.sessionStorage, checkKey, String(now));
  return true;
}

function getCurrentBuildId() {
  const nextData = (window as Window & { __NEXT_DATA__?: { buildId?: unknown } }).__NEXT_DATA__;
  if (typeof nextData?.buildId === "string" && nextData.buildId.length > 0) {
    return nextData.buildId;
  }

  const scriptBuildId = getBuildIdFromNextStaticScripts();
  if (scriptBuildId) return scriptBuildId;

  const staticAssetFingerprint = getNextStaticAssetFingerprint();
  if (staticAssetFingerprint) return `assets-${staticAssetFingerprint}`;

  return "unknown-build";
}

function getBuildIdFromNextStaticScripts() {
  const ignoredStaticSegments = new Set(["chunks", "development", "media", "css"]);
  for (const script of Array.from(document.scripts)) {
    const scriptSrc = script.getAttribute("src");
    if (!scriptSrc) continue;

    const manifestMatch = scriptSrc.match(/\/_next\/static\/([^/]+)\/(?:_buildManifest|_ssgManifest)\.js(?:\?.*)?$/);
    if (manifestMatch?.[1]) {
      return manifestMatch[1];
    }

    const genericMatch = scriptSrc.match(/\/_next\/static\/([^/]+)\//);
    const candidate = genericMatch?.[1];
    if (!candidate || ignoredStaticSegments.has(candidate)) continue;
    return candidate;
  }
  return null;
}

function getNextStaticAssetFingerprint() {
  const staticAssets = new Set<string>();

  for (const script of Array.from(document.scripts)) {
    const normalizedPath = normalizeNextStaticAssetPath(script.getAttribute("src"));
    if (normalizedPath) {
      staticAssets.add(normalizedPath);
    }
  }

  for (const stylesheet of Array.from(document.querySelectorAll("link[rel='stylesheet']"))) {
    const normalizedPath = normalizeNextStaticAssetPath(stylesheet.getAttribute("href"));
    if (normalizedPath) {
      staticAssets.add(normalizedPath);
    }
  }

  if (staticAssets.size === 0) return null;
  const serialized = Array.from(staticAssets).sort().join("|");
  return hashStable(serialized);
}

function normalizeNextStaticAssetPath(rawPath: string | null) {
  if (!rawPath) return null;
  try {
    const baseHref = window.location.href || "http://localhost/";
    const url = new URL(rawPath, baseHref);
    if (!url.pathname.startsWith("/_next/static/")) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function hashStable(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function clearCachesAndReload() {
  const serviceWorkersChanged = await clearServiceWorkers();
  const cacheStorageChanged = await clearBrowserCaches();
  if (serviceWorkersChanged || cacheStorageChanged) {
    window.location.reload();
  }
}

async function clearServiceWorkers() {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) return false;
    const unregisterResults = await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    return unregisterResults.some((result) => result.status === "fulfilled" && result.value);
  } catch {
    return false;
  }
}

async function clearBrowserCaches() {
  if (!("caches" in window)) return false;
  try {
    const keys = await caches.keys();
    if (keys.length === 0) return false;
    const deleteResults = await Promise.allSettled(keys.map((key) => caches.delete(key)));
    return deleteResults.some((result) => result.status === "fulfilled" && result.value);
  } catch {
    return false;
  }
}

function safeStorageGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode, disabled storage, quota).
  }
}
