'use client';

import { useEffect, useState } from "react";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { listFeatureFlags } from "../api/client";
import type { FeatureFlag } from "../types";

const fallbackFlags: FeatureFlag[] = [
  { key: "peer_feedback", label: "Peer feedback", enabled: true },
  { key: "modules", label: "Modules", enabled: true },
  { key: "repos", label: "Repos", enabled: false },
];

type Status = "idle" | "loading" | "error" | "success";

export function FeatureFlagsCard() {
  const [flags, setFlags] = useState<FeatureFlag[]>(fallbackFlags);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let subscribed = true;
    const loadFlags = async () => {
      setStatus("loading");
      try {
        const response = await listFeatureFlags();
        if (subscribed && response.length > 0) {
          setFlags(response);
        }
        setStatus("idle");
      } catch (err) {
        if (subscribed) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Could not load flags.");
        }
      }
    };
    loadFlags();
    return () => {
      subscribed = false;
    };
  }, []);

  return (
    <div className="stack">
      {message ? (
        <div
          className={status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}
          style={{ padding: "10px 12px" }}
        >
          <span style={{ fontSize: 16 }}>{status === "error" ? "⚠️" : "✅"}</span>
          <span>{message}</span>
        </div>
      ) : null}
      <FeatureFlagsPanel flags={flags} />
    </div>
  );
}
