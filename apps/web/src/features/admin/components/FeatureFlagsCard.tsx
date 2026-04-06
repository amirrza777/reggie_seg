'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { listFeatureFlags, updateFeatureFlag } from "../api/client";
import type { FeatureFlag } from "../types";

type Status = "idle" | "loading" | "error" | "success";

type FeatureFlagsUpdater = Dispatch<SetStateAction<Record<string, boolean>>>;
type FeatureFlagsSetter = Dispatch<SetStateAction<FeatureFlag[]>>;
type StatusSetter = Dispatch<SetStateAction<Status>>;
type MessageSetter = Dispatch<SetStateAction<string | null>>;

function useLoadFeatureFlags(setFlags: FeatureFlagsSetter, setStatus: StatusSetter, setMessage: MessageSetter) {
  useEffect(() => {
    let subscribed = true;
    const loadFlags = async () => {
      setStatus("loading");
      try {
        const response = await listFeatureFlags();
        if (!subscribed) {
          return;
        }
        setFlags(response);
        setStatus("success");
      } catch (error) {
        if (!subscribed) {
          return;
        }
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not load flags.");
      }
    };
    void loadFlags();
    return () => {
      subscribed = false;
    };
  }, [setFlags, setStatus, setMessage]);
}

function useToggleFeatureFlag(setFlags: FeatureFlagsSetter, setMessage: MessageSetter, setUpdating: FeatureFlagsUpdater, flags: FeatureFlag[]) {
  return async (key: string, enabled: boolean) => {
    setUpdating((prev) => ({ ...prev, [key]: true }));
    setMessage(null);
    const previous = flags;
    setFlags((prev) => prev.map((flag) => (flag.key === key ? { ...flag, enabled } : flag)));
    try {
      const updated = await updateFeatureFlag(key, enabled);
      setFlags((prev) => prev.map((flag) => (flag.key === key ? updated : flag)));
    } catch (error) {
      setFlags(previous);
      setMessage(error instanceof Error ? error.message : "Could not update flag.");
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  };
}

export function FeatureFlagsCard() {
  const state = useFeatureFlagsState();

  return (
    <div className="stack">
      <FeatureFlagsMessage status={state.status} message={state.message} />
      <FeatureFlagsPanel flags={state.flags} onToggle={state.handleToggle} updating={state.updating} />
    </div>
  );
}

function useFeatureFlagsState() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  useLoadFeatureFlags(setFlags, setStatus, setMessage);
  const handleToggle = useToggleFeatureFlag(setFlags, setMessage, setUpdating, flags);

  return { flags, status, message, updating, handleToggle };
}

function FeatureFlagsMessage({ status, message }: { status: Status; message: string | null }) {
  if (!message) {return null;}

  return (
    <div
      className={status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}
      style={{ padding: "10px 12px" }}
    >
      <span>{message}</span>
    </div>
  );
}
