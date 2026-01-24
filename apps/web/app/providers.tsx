'use client';

import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  // Add things like QueryClientProvider/ThemeProvider here later.
  return <>{children}</>;
}
