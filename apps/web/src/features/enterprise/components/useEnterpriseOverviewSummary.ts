"use client";

import { useEffect, useMemo, useState } from "react";
import { getEnterpriseOverview } from "../api/client";
import type { EnterpriseOverview } from "../types";
import { buildEnterpriseOverviewSummaryView } from "./enterpriseOverviewSummary.logic";

type RequestState = "idle" | "loading" | "success" | "error";

async function loadEnterpriseOverview(params: {
  setOverview: (value: EnterpriseOverview) => void;
  setStatus: (value: RequestState) => void;
  setMessage: (value: string | null) => void;
  setLoadedAt: (value: Date | null) => void;
}) {
  params.setStatus("loading");
  params.setMessage(null);
  try {
    const response = await getEnterpriseOverview();
    params.setOverview(response);
    params.setLoadedAt(new Date());
    params.setStatus("success");
  } catch (err) {
    params.setStatus("error");
    params.setLoadedAt(null);
    params.setMessage(err instanceof Error ? err.message : "Could not load enterprise overview.");
  }
}

export function useEnterpriseOverviewSummary() {
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  useEffect(() => {
    void loadEnterpriseOverview({ setOverview, setStatus, setMessage, setLoadedAt });
  }, []);
  const summaryView = useMemo(() => buildEnterpriseOverviewSummaryView(overview, status, message, loadedAt), [loadedAt, message, overview, status]);
  return { overview, status, message, ...summaryView };
}
