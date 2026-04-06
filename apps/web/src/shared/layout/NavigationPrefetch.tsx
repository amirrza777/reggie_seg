"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavigationPrefetchProps = {
  hrefs: string[];
  limit?: number;
};

const DEFAULT_PREFETCH_LIMIT = 18;
const PREFETCH_DELAY_MS = 0;
const PREFETCH_STEP_MS = 45;
const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

type PrefetchNavigator = Navigator & {
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
  deviceMemory?: number;
};

function resolveNavigatorConnection(nav: PrefetchNavigator): NavigatorConnection | undefined {
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

function shouldSkipPrefetchForConnection(connection: NavigatorConnection | undefined): boolean {
  if (!connection) {
    return false;
  }
  if (connection.saveData) {
    return true;
  }
  return Boolean(connection.effectiveType && SLOW_EFFECTIVE_TYPES.has(connection.effectiveType));
}

function shouldSkipPrefetchForDeviceMemory(nav: PrefetchNavigator): boolean {
  return typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
}

function shouldSkipPrefetchForDeviceAndNetwork() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const nav = navigator as PrefetchNavigator;
  if (shouldSkipPrefetchForConnection(resolveNavigatorConnection(nav))) {
    return true;
  }
  return shouldSkipPrefetchForDeviceMemory(nav);
}

function normalizeAppHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  const withoutQuery = trimmed.split("?")[0];
  const withoutHash = withoutQuery.split("#")[0];
  return withoutHash.length > 0 ? withoutHash : null;
}

function buildPrefetchTargets(hrefs: string[], limit: number, pathname: string): string[] {
  const targets: string[] = [];
  const seen = new Set<string>();
  const normalizedPathname = normalizeAppHref(pathname);

  for (const href of hrefs) {
    if (targets.length >= limit) {
      break;
    }
    const normalized = normalizeAppHref(href);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    if (normalizedPathname && normalized === normalizedPathname) {
      continue;
    }
    seen.add(normalized);
    targets.push(normalized);
  }

  return targets;
}

export function NavigationPrefetch({ hrefs, limit = DEFAULT_PREFETCH_LIMIT }: NavigationPrefetchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const targets = useMemo(() => buildPrefetchTargets(hrefs, limit, pathname), [hrefs, limit, pathname]);

  useEffect(() => {
    if (shouldSkipPrefetchForDeviceAndNetwork()) {
      return;
    }
    if (targets.length === 0) {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;

    const prefetchNext = (index: number) => {
      if (cancelled || index >= targets.length) {
        return;
      }
      router.prefetch(targets[index]);
      timerId = window.setTimeout(() => prefetchNext(index + 1), PREFETCH_STEP_MS);
    };

    timerId = window.setTimeout(() => prefetchNext(0), PREFETCH_DELAY_MS);

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [router, targets]);

  return null;
}
