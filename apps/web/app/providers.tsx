'use client';

import { useEffect } from "react";
import type { ReactNode } from "react";
import { UserProvider } from "@/features/auth/context";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const originalScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = originalScrollRestoration;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
      return;
    }

    const cacheResetKey = "tf_dev_cache_reset_v1";
    if (window.sessionStorage.getItem(cacheResetKey) === "done") {
      return;
    }
    window.sessionStorage.setItem(cacheResetKey, "done");

    const clearDevCaches = async () => {
      let changed = false;

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          changed = true;
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        if (keys.length > 0) {
          changed = true;
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      }

      if (changed) {
        window.location.reload();
      }
    };

    void clearDevCaches();
  }, []);

  // Add things like QueryClientProvider/ThemeProvider here later.
  return <UserProvider>{children}</UserProvider>;
}
