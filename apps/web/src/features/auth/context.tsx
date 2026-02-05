'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UserProfile } from "./types";
import { getCurrentUser } from "./api/client";

type UserContextValue = {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  const refresh = useCallback(async () => {
    const profile = await getCurrentUser();
    setUser(profile);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setUser(null);
    });
  }, [refresh]);

  const value = useMemo(() => ({ user, setUser, refresh }), [user, refresh]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
