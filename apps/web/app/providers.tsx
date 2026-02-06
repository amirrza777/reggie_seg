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

  // Add things like QueryClientProvider/ThemeProvider here later.
  return <UserProvider>{children}</UserProvider>;
}
