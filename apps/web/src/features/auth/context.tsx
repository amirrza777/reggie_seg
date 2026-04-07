/* eslint-disable react-refresh/only-export-components */
'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentUser, refreshAccessToken } from "./api/client";
import { AUTH_STATE_EVENT } from "./api/session";
import { UserContext } from "./userContext";
import type { UserProfile } from "./types";

function useInitialUserRefresh(refresh: () => Promise<UserProfile | null>) {
  useEffect(() => {
    void refresh();
  }, [refresh]);
}

function useAuthStateListener(
  user: UserProfile | null,
  refresh: () => Promise<UserProfile | null>,
  setUser: (value: UserProfile | null) => void,
  setLoading: (value: boolean) => void,
) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleAuthState = (event: Event) => {
      const authEvent = event as CustomEvent<{ authenticated?: boolean }>;
      if (authEvent.detail?.authenticated === false) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (authEvent.detail?.authenticated === true && !user) {
        void refresh();
      }
    };
    window.addEventListener(AUTH_STATE_EVENT, handleAuthState as EventListener);
    return () => window.removeEventListener(AUTH_STATE_EVENT, handleAuthState as EventListener);
  }, [refresh, setLoading, setUser, user]);
}

function useAccessTokenWarmup(user: UserProfile | null) {
  useEffect(() => {
    if (typeof window === "undefined" || !user) {
      return;
    }
    const refreshSilently = () => {
      void refreshAccessToken();
    };
    // Keep access token warm during long-lived open tabs to avoid 15m idle expiry UX.
    const intervalId = window.setInterval(refreshSilently, 10 * 60 * 1000);
    const handleFocus = () => refreshSilently();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSilently();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getCurrentUser();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useInitialUserRefresh(refresh);
  useAuthStateListener(user, refresh, setUser, setLoading);
  useAccessTokenWarmup(user);
  const value = useMemo(() => ({ user, setUser, refresh, loading }), [user, refresh, loading]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export { useUser } from "./useUser";
