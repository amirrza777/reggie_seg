'use client';

import { useEffect } from "react";
import type { ReactNode } from "react";
import { UserProvider } from "@/features/auth/context";

export function AppProviders({ children }: { children: ReactNode }) {
  useManualScrollRestoration();
  useDevCacheReset();

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

function useDevCacheReset() {
  useEffect(() => {
    if (!isDevelopmentBrowser()) return;

    const cacheResetKey = "tf_dev_cache_reset_v1";
    if (window.sessionStorage.getItem(cacheResetKey) === "done") return;
    window.sessionStorage.setItem(cacheResetKey, "done");
    void clearDevCachesAndReload();
  }, []);
}

function isDevelopmentBrowser() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "development";
}

async function clearDevCachesAndReload() {
  const serviceWorkersChanged = await clearServiceWorkers();
  const cacheStorageChanged = await clearBrowserCaches();
  if (serviceWorkersChanged || cacheStorageChanged) {
    window.location.reload();
  }
}

async function clearServiceWorkers() {
  if (!("serviceWorker" in navigator)) return false;
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return false;
  await Promise.all(registrations.map((registration) => registration.unregister()));
  return true;
}

async function clearBrowserCaches() {
  if (!("caches" in window)) return false;
  const keys = await caches.keys();
  if (keys.length === 0) return false;
  await Promise.all(keys.map((key) => caches.delete(key)));
  return true;
}
