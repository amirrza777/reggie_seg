"use client";

import { useEffect, useMemo, useState } from "react";
import { getEnterpriseOverview } from "../api/client";
import type { EnterpriseOverview } from "../types";
import { buildEnterpriseOverviewSummaryView } from "./enterpriseOverviewSummary.logic";

type RequestState = "idle" | "loading" | "success" | "error";

export function useEnterpriseOverviewSummary() {
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      setStatus("loading");
      setMessage(null);

      try {
        const response = await getEnterpriseOverview();
        setOverview(response);
        setLoadedAt(new Date());
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setLoadedAt(null);
        setMessage(err instanceof Error ? err.message : "Could not load enterprise overview.");
      }
    };

    void loadOverview();
  }, []);

  const summaryView = useMemo(
    () => buildEnterpriseOverviewSummaryView(overview, status, message, loadedAt),
    [loadedAt, message, overview, status]
  );

  return {
    overview,
    status,
    message,
    ...summaryView,
  };
}
