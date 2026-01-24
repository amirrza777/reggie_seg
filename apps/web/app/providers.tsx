'use client';

import { useEffect } from "react";
import type { ReactNode } from "react";

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

  // Add things like QueryClientProvider/ThemeProvider here later.
  return <>{children}</>;
}
