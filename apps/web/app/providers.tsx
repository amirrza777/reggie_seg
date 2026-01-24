'use client';

import { useEffect } from "react";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = `scroll-position:${window.location.pathname}${window.location.search}`;
    const originalScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const saveScrollPosition = () => {
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      } catch {
        // Ignore write errors (private mode, storage disabled).
      }
    };

    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload =
      navigationEntry?.type === "reload" ||
      (performance as Performance & { navigation?: { type?: number } }).navigation?.type === 1;

    if (isReload) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        const savedY = saved ? Number(saved) : Number.NaN;
        if (!Number.isNaN(savedY)) {
          requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, savedY)));
        }
      } catch {
        // Ignore read errors.
      }
    }

    window.addEventListener("pagehide", saveScrollPosition);
    window.addEventListener("beforeunload", saveScrollPosition);
    return () => {
      window.removeEventListener("pagehide", saveScrollPosition);
      window.removeEventListener("beforeunload", saveScrollPosition);
      window.history.scrollRestoration = originalScrollRestoration;
    };
  }, []);

  // Add things like QueryClientProvider/ThemeProvider here later.
  return <>{children}</>;
}
