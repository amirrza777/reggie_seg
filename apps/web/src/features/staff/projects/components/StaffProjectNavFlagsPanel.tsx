"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStaffProjectNavFlagsConfig,
  updateStaffProjectNavFlagsConfig,
} from "@/features/projects/api/client";
import type {
  ProjectNavFlagKey,
  ProjectNavFlagsConfig,
  ProjectNavPeerMode,
  StaffProjectNavFlagsConfigResponse,
} from "@/features/projects/types";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

type StaffProjectNavFlagsPanelProps = {
  projectId: number;
  globalFeatureFlags?: Record<string, boolean>;
};

type ProjectNavPhase = "active" | "completed";

const TAB_LABELS: Array<{ key: ProjectNavFlagKey; label: string }> = [
  { key: "team", label: "Team" },
  { key: "meetings", label: "Meetings" },
  { key: "peer_assessment", label: "Peer assessment" },
  { key: "peer_feedback", label: "Peer feedback" },
  { key: "repos", label: "Repositories" },
  { key: "trello", label: "Trello" },
  { key: "discussion", label: "Discussion forum" },
  { key: "team_health", label: "Team health" },
];

function getBusyKey(phase: ProjectNavPhase, key: ProjectNavFlagKey) {
  return `${phase}:${key}`;
}

function getModeBusyKey(key: "peer_assessment" | "peer_feedback") {
  return `mode:${key}`;
}

function isPeerModeFlag(key: ProjectNavFlagKey): key is "peer_assessment" | "peer_feedback" {
  return key === "peer_assessment" || key === "peer_feedback";
}

function isOpenDate(value: string | null | undefined) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  return timestamp <= Date.now();
}

function updateConfigState(
  config: ProjectNavFlagsConfig,
  phase: ProjectNavPhase,
  key: ProjectNavFlagKey,
  enabled: boolean,
): ProjectNavFlagsConfig {
  return {
    version: 1,
    active: {
      ...config.active,
      ...(phase === "active" ? { [key]: enabled } : {}),
    },
    completed: {
      ...config.completed,
      ...(phase === "completed" ? { [key]: enabled } : {}),
    },
    peerModes: { ...config.peerModes },
  };
}

function updatePeerModeState(
  config: ProjectNavFlagsConfig,
  key: "peer_assessment" | "peer_feedback",
  mode: ProjectNavPeerMode,
): ProjectNavFlagsConfig {
  return {
    version: 1,
    active: { ...config.active },
    completed: { ...config.completed },
    peerModes: {
      ...config.peerModes,
      [key]: mode,
    },
  };
}

function createStatusChip(enabled: boolean) {
  return (
    <span className={enabled ? "status-chip status-chip--success" : "status-chip status-chip--danger"}>
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

export function StaffProjectNavFlagsPanel({ projectId, globalFeatureFlags }: StaffProjectNavFlagsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<StaffProjectNavFlagsConfigResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const result = await getStaffProjectNavFlagsConfig(projectId);
        if (cancelled) return;
        setPayload(result);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load project feature flags.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleToggle = async (phase: ProjectNavPhase, key: ProjectNavFlagKey, enabled: boolean) => {
    if (!payload) return;
    const busyKey = getBusyKey(phase, key);
    const previousConfig = payload.projectNavFlags;
    const nextConfig = updateConfigState(previousConfig, phase, key, enabled);

    setBusy((prev) => ({ ...prev, [busyKey]: true }));
    setError(null);
    setMessage(null);
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        projectNavFlags: nextConfig,
      };
    });

    try {
      const updated = await updateStaffProjectNavFlagsConfig(projectId, nextConfig);
      setPayload(updated);
      setMessage("Project feature flags saved.");
    } catch (updateError) {
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          projectNavFlags: previousConfig,
        };
      });
      setError(updateError instanceof Error ? updateError.message : "Failed to update project feature flags.");
    } finally {
      setBusy((prev) => ({ ...prev, [busyKey]: false }));
    }
  };

  const handlePeerModeChange = async (
    key: "peer_assessment" | "peer_feedback",
    mode: ProjectNavPeerMode,
  ) => {
    if (!payload) return;
    const busyKey = getModeBusyKey(key);
    const previousConfig = payload.projectNavFlags;
    const nextConfig = updatePeerModeState(previousConfig, key, mode);

    setBusy((prev) => ({ ...prev, [busyKey]: true }));
    setError(null);
    setMessage(null);
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        projectNavFlags: nextConfig,
      };
    });

    try {
      const updated = await updateStaffProjectNavFlagsConfig(projectId, nextConfig);
      setPayload(updated);
      setMessage("Project feature flags saved.");
    } catch (updateError) {
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          projectNavFlags: previousConfig,
        };
      });
      setError(updateError instanceof Error ? updateError.message : "Failed to update project feature flags.");
    } finally {
      setBusy((prev) => ({ ...prev, [busyKey]: false }));
    }
  };

  const rows = useMemo(() => {
    if (!payload) return [];
    return TAB_LABELS.map(({ key, label }) => {
      const activeEnabled = payload.projectNavFlags.active[key];
      const completedEnabled = payload.projectNavFlags.completed[key];
      const activeBusy = busy[getBusyKey("active", key)] === true;
      const completedBusy = busy[getBusyKey("completed", key)] === true;
      const isPeerFlag = isPeerModeFlag(key);
      const peerMode = isPeerFlag ? payload.projectNavFlags.peerModes[key] : null;
      const modeBusy = isPeerFlag ? busy[getModeBusyKey(key)] === true : false;
      const naturalActiveEnabled = isPeerFlag
        ? key === "peer_assessment"
          ? isOpenDate(payload.deadlineWindow.assessmentOpenDate)
          : isOpenDate(payload.deadlineWindow.feedbackOpenDate)
        : false;
      const activeEffectiveEnabled =
        isPeerFlag && peerMode === "NATURAL" ? naturalActiveEnabled : activeEnabled;
      const isActiveEditable = !(isPeerFlag && peerMode === "NATURAL");

      return [
        <div key={`${key}-label`} className="staff-projects__feature-flag-label">
          <span>{label}</span>
          {isPeerFlag ? (
            <label className="staff-projects__feature-flag-mode-row">
              <input
                type="checkbox"
                checked={peerMode === "MANUAL"}
                onChange={(event) =>
                  void handlePeerModeChange(key, event.currentTarget.checked ? "MANUAL" : "NATURAL")
                }
                disabled={modeBusy}
              />
              <span>{peerMode === "MANUAL" ? "Manual mode" : "Natural mode (deadline-based)"}</span>
            </label>
          ) : null}
        </div>,
        <div key={`${key}-active`} className="feature-flag-action">
          {createStatusChip(activeEffectiveEnabled)}
          <Button
            type="button"
            variant={activeEffectiveEnabled ? "ghost" : "primary"}
            size="sm"
            onClick={() => void handleToggle("active", key, !activeEnabled)}
            disabled={activeBusy || !isActiveEditable}
            className="feature-flag-action__btn"
          >
            {activeBusy ? "Saving..." : isActiveEditable ? activeEffectiveEnabled ? "Disable" : "Enable" : "Auto"}
          </Button>
        </div>,
        <div key={`${key}-completed`} className="feature-flag-action">
          {createStatusChip(completedEnabled)}
          <Button
            type="button"
            variant={completedEnabled ? "ghost" : "primary"}
            size="sm"
            onClick={() => void handleToggle("completed", key, !completedEnabled)}
            disabled={completedBusy}
            className="feature-flag-action__btn"
          >
            {completedBusy ? "Saving..." : completedEnabled ? "Disable" : "Enable"}
          </Button>
        </div>,
      ];
    });
  }, [busy, payload]);

  const globallyDisabledTabs = useMemo(() => {
    if (!globalFeatureFlags) return [];
    return TAB_LABELS.filter(({ key }) =>
      Object.prototype.hasOwnProperty.call(globalFeatureFlags, key) && globalFeatureFlags[key] === false,
    ).map((tab) => tab.label);
  }, [globalFeatureFlags]);

  return (
    <div className="stack">
      {loading ? <p className="muted">Loading project feature flags...</p> : null}
      {message ? (
        <div className="status-alert status-alert--success" style={{ padding: "10px 12px" }}>
          <span>{message}</span>
        </div>
      ) : null}
      {error ? (
        <div className="status-alert status-alert--error" style={{ padding: "10px 12px" }}>
          <span>{error}</span>
        </div>
      ) : null}

      <Card title="Project navigation access">
        <Table
          headers={["Tab", "Active project", "Completed project"]}
          rows={rows}
          className="feature-flags-table"
          rowClassName="feature-flags-table__row"
          columnTemplate="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)"
        />
      </Card>
      {globallyDisabledTabs.length > 0 ? (
        <div className="status-alert status-alert--error staff-projects__enterprise-override-alert">
          <p>
            Enterprise feature flags are currently overriding this project configuration.
          </p>
          <p>
            Disabled at enterprise level: <strong>{globallyDisabledTabs.join(", ")}</strong>.
          </p>
          <p>These tabs stay hidden for students until re-enabled in Enterprise feature flags.</p>
        </div>
      ) : null}
    </div>
  );
}
