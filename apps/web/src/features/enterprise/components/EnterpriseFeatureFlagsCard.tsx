'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { listEnterpriseFeatureFlags, updateEnterpriseFeatureFlag } from "../api/client";
import type { EnterpriseFeatureFlag } from "../types";
import { EnterpriseFeatureFlagsPanel } from "./EnterpriseFeatureFlagsPanel";

type Status = "idle" | "loading" | "error" | "success";

type EnterpriseFlagSetters = {
  setFlags: Dispatch<SetStateAction<EnterpriseFeatureFlag[]>>;
  setStatus: Dispatch<SetStateAction<Status>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setUpdating: Dispatch<SetStateAction<Record<string, boolean>>>;
};

function useEnterpriseFeatureFlagsLoadEffect(
  setFlags: EnterpriseFlagSetters["setFlags"],
  setStatus: EnterpriseFlagSetters["setStatus"],
  setMessage: EnterpriseFlagSetters["setMessage"],
) {
  useEffect(() => {
    let subscribed = true;
    const loadFlags = async () => {
      setStatus("loading");
      try {
        const response = await listEnterpriseFeatureFlags();
        if (!subscribed) {
          return;
        }
        setFlags(response);
        setStatus("success");
      } catch (err) {
        if (!subscribed) {
          return;
        }
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not load flags.");
      }
    };
    void loadFlags();
    return () => { subscribed = false; };
  }, [setFlags, setMessage, setStatus]);
}

function useEnterpriseFeatureFlagToggle(
  setFlags: EnterpriseFlagSetters["setFlags"],
  setStatus: EnterpriseFlagSetters["setStatus"],
  setMessage: EnterpriseFlagSetters["setMessage"],
  setUpdating: EnterpriseFlagSetters["setUpdating"],
) {
  return useCallback(async (key: string, enabled: boolean) => {
    setUpdating((prev) => ({ ...prev, [key]: true }));
    setMessage(null);
    setFlags((prev) => prev.map((flag) => (flag.key === key ? { ...flag, enabled } : flag)));
    try {
      const updated = await updateEnterpriseFeatureFlag(key, enabled);
      setFlags((prev) => prev.map((flag) => (flag.key === key ? updated : flag)));
      setStatus("success");
    } catch (err) {
      setFlags((prev) => prev.map((flag) => (flag.key === key ? { ...flag, enabled: !enabled } : flag)));
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not update flag.");
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  }, [setFlags, setMessage, setStatus, setUpdating]);
}

function EnterpriseFeatureFlagsMessage({ status, message }: { status: Status; message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <div className={status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"} style={{ padding: "10px 12px" }}>
      <span>{message}</span>
    </div>
  );
}

export function EnterpriseFeatureFlagsCard() {
  const [flags, setFlags] = useState<EnterpriseFeatureFlag[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  useEnterpriseFeatureFlagsLoadEffect(setFlags, setStatus, setMessage);
  const handleToggle = useEnterpriseFeatureFlagToggle(setFlags, setStatus, setMessage, setUpdating);
  return (
    <div className="stack">
      <EnterpriseFeatureFlagsMessage status={status} message={message} />
      <EnterpriseFeatureFlagsPanel flags={flags} onToggle={handleToggle} updating={updating} />
    </div>
  );
}
