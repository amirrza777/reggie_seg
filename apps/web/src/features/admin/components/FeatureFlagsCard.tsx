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

  const alertStyle =
    status === "error"
      ? {
          backgroundColor: "rgba(255, 77, 79, 0.08)",
          border: "1px solid rgba(255, 77, 79, 0.35)",
          color: "#a11a1c",
        }
      : {
          backgroundColor: "rgba(47, 158, 68, 0.08)",
          border: "1px solid rgba(47, 158, 68, 0.35)",
          color: "#1f7a36",
        };

  return (
    <div className="stack">
      {message ? (
        <div
          style={{
            ...alertStyle,
            borderRadius: 12,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>{status === "error" ? "⚠️" : "✅"}</span>
          <span>{message}</span>
        </div>
      ) : null}
      <FeatureFlagsPanel flags={flags} />
    </div>
  );
}
