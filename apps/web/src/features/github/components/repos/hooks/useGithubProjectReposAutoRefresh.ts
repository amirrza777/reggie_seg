"use client";

import { useEffect, useRef } from "react";
import { analyseProjectGithubRepo } from "../../../api/client";
import type { GithubLatestSnapshot, ProjectGithubRepoLink } from "../../../types";

const SNAPSHOT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const AUTO_REFRESH_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function parseIsoToEpochMs(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

function toLocalDayKey(epochMs: number) {
  const date = new Date(epochMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type UseGithubProjectReposAutoRefreshProps = {
  enabled: boolean;
  links: ProjectGithubRepoLink[];
  latestSnapshotByLinkId: Record<number, GithubLatestSnapshot["snapshot"] | null>;
  busy: boolean;
  linking: boolean;
  removingLinkId: number | null;
  load: () => Promise<void>;
  setBusy: (value: boolean) => void;
  setError: (value: string | null) => void;
  setInfo: (value: string | null) => void;
};

export function useGithubProjectReposAutoRefresh({
  enabled,
  links,
  latestSnapshotByLinkId,
  busy,
  linking,
  removingLinkId,
  load,
  setBusy,
  setError,
  setInfo,
}: UseGithubProjectReposAutoRefreshProps) {
  const autoRefreshInFlightRef = useRef(false);
  const autoRefreshAttemptedDayByLinkRef = useRef<Record<number, string>>({});
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) {
      return;
    }

    let cancelled = false;

    async function maybeAutoRefreshSnapshots() {
      if (cancelled || autoRefreshInFlightRef.current) {
        return;
      }
      if (busy || linking || removingLinkId != null) {
        return;
      }

      const nowMs = Date.now();
      const todayKey = toLocalDayKey(nowMs);
      const staleLinks = links.filter((link) => {
        if (!link.isActive || !link.autoSyncEnabled) {
          return false;
        }
        if (autoRefreshAttemptedDayByLinkRef.current[link.id] === todayKey) {
          return false;
        }
        const snapshot = latestSnapshotByLinkId[link.id] ?? null;
        const analysedAtMs = parseIsoToEpochMs(snapshot?.analysedAt ?? null);
        if (analysedAtMs == null) {
          return true;
        }
        return nowMs - analysedAtMs >= SNAPSHOT_STALE_AFTER_MS;
      });

      if (staleLinks.length <= 0) {
        return;
      }

      for (const link of staleLinks) {
        autoRefreshAttemptedDayByLinkRef.current[link.id] = todayKey;
      }

      autoRefreshInFlightRef.current = true;
      setBusy(true);
      setError(null);

      try {
        await Promise.all(staleLinks.map((link) => analyseProjectGithubRepo(link.id)));
        if (cancelled) return;
        await loadRef.current();
        if (!cancelled) {
          setInfo("Repository snapshot auto-refreshed (24h schedule).");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to auto-refresh repository snapshot.");
        }
      } finally {
        autoRefreshInFlightRef.current = false;
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void maybeAutoRefreshSnapshots();
    const intervalId = window.setInterval(() => {
      void maybeAutoRefreshSnapshots();
    }, AUTO_REFRESH_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, links, latestSnapshotByLinkId, busy, linking, removingLinkId, setBusy, setError, setInfo]);
}
