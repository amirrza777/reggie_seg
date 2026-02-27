'use client';

import { useEffect, useState } from "react";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { listFeatureFlags, updateFeatureFlag } from "../api/client";
import type { FeatureFlag } from "../types";

type Status = "idle" | "loading" | "error" | "success";

export function FeatureFlagsCard() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let subscribed = true;
    const loadFlags = async () => {
      setStatus("loading");
      try {
        const response = await listFeatureFlags();
        if (!subscribed) return;
        setFlags(response);
        setStatus("success");
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

  const handleToggle = async (key: string, enabled: boolean) => {
    setUpdating((prev) => ({ ...prev, [key]: true }));
    setMessage(null);
    const previous = flags;
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
    try {
      const updated = await updateFeatureFlag(key, enabled);
      setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
    } catch (err) {
      setFlags(previous);
      setMessage(err instanceof Error ? err.message : "Could not update flag.");
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  };

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
      <FeatureFlagsPanel flags={flags} onToggle={handleToggle} updating={updating} />
    </div>
  );
}
