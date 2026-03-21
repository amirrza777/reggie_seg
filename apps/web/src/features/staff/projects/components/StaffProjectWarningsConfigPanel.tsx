"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStaffProjectWarningsConfig,
  updateStaffProjectWarningsConfig,
} from "@/features/projects/api/client";
import type {
  ProjectWarningRuleConfig,
  ProjectWarningsConfig,
  WarningRuleSeverity,
} from "@/features/projects/types";
import { Button } from "@/shared/ui/Button";

type StaffProjectWarningsConfigPanelProps = {
  projectId: number;
};

type WarningConfigState = {
  attendance: {
    enabled: boolean;
    severity: WarningRuleSeverity;
    minPercent: number;
    lookbackDays: number;
  };
  meetingFrequency: {
    enabled: boolean;
    severity: WarningRuleSeverity;
    minPerWeek: number;
    lookbackDays: number;
  };
  contributionActivity: {
    enabled: boolean;
    severity: WarningRuleSeverity;
    minCommits: number;
    lookbackDays: number;
  };
};

const DEFAULT_WARNING_CONFIG: WarningConfigState = {
  attendance: {
    enabled: true,
    severity: "HIGH",
    minPercent: 30,
    lookbackDays: 30,
  },
  meetingFrequency: {
    enabled: true,
    severity: "MEDIUM",
    minPerWeek: 1,
    lookbackDays: 28,
  },
  contributionActivity: {
    enabled: false,
    severity: "MEDIUM",
    minCommits: 4,
    lookbackDays: 14,
  },
};

function cloneDefaultWarningConfig(): WarningConfigState {
  return {
    attendance: { ...DEFAULT_WARNING_CONFIG.attendance },
    meetingFrequency: { ...DEFAULT_WARNING_CONFIG.meetingFrequency },
    contributionActivity: { ...DEFAULT_WARNING_CONFIG.contributionActivity },
  };
}

function cloneWarningConfig(config: WarningConfigState): WarningConfigState {
  return {
    attendance: { ...config.attendance },
    meetingFrequency: { ...config.meetingFrequency },
    contributionActivity: { ...config.contributionActivity },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSeverity(value: unknown, fallback: WarningRuleSeverity): WarningRuleSeverity {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH") return value;
  return fallback;
}

function mapApiConfigToState(apiConfig: ProjectWarningsConfig): {
  state: WarningConfigState;
  extraRules: ProjectWarningRuleConfig[];
} {
  const state = cloneDefaultWarningConfig();
  const extraRules: ProjectWarningRuleConfig[] = [];

  for (const rule of apiConfig.rules) {
    const params = isRecord(rule.params) ? rule.params : {};

    if (rule.key === "LOW_ATTENDANCE") {
      state.attendance.enabled = rule.enabled;
      state.attendance.severity = toSeverity(rule.severity, state.attendance.severity);
      state.attendance.minPercent = toNumber(params.minPercent, state.attendance.minPercent);
      state.attendance.lookbackDays = toNumber(params.lookbackDays, state.attendance.lookbackDays);
      continue;
    }

    if (rule.key === "MEETING_FREQUENCY") {
      state.meetingFrequency.enabled = rule.enabled;
      state.meetingFrequency.severity = toSeverity(rule.severity, state.meetingFrequency.severity);
      state.meetingFrequency.minPerWeek = toNumber(params.minPerWeek, state.meetingFrequency.minPerWeek);
      state.meetingFrequency.lookbackDays = toNumber(params.lookbackDays, state.meetingFrequency.lookbackDays);
      continue;
    }

    if (rule.key === "LOW_CONTRIBUTION_ACTIVITY" || rule.key === "LOW_COMMIT_ACTIVITY") {
      state.contributionActivity.enabled = rule.enabled;
      state.contributionActivity.severity = toSeverity(rule.severity, state.contributionActivity.severity);
      state.contributionActivity.minCommits = toNumber(params.minCommits, state.contributionActivity.minCommits);
      state.contributionActivity.lookbackDays = toNumber(params.lookbackDays, state.contributionActivity.lookbackDays);
      continue;
    }

    extraRules.push(rule);
  }

  return { state, extraRules };
}

export function StaffProjectWarningsConfigPanel({
  projectId,
}: StaffProjectWarningsConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WarningConfigState>(() => cloneDefaultWarningConfig());
  const [extraRules, setExtraRules] = useState<ProjectWarningRuleConfig[]>([]);
  const [savedConfig, setSavedConfig] = useState<WarningConfigState>(() => cloneDefaultWarningConfig());
  const [savedExtraRules, setSavedExtraRules] = useState<ProjectWarningRuleConfig[]>([]);
  const [hasPersistedConfig, setHasPersistedConfig] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setPanelMessage(null);
        setPanelError(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadConfig() {
      setIsLoading(true);
      setPanelError(null);
      setPanelMessage(null);
      try {
        const response = await getStaffProjectWarningsConfig(projectId);
        if (cancelled) return;
        const mapped = mapApiConfigToState(response.warningsConfig);
        setConfig(cloneWarningConfig(mapped.state));
        setExtraRules([...mapped.extraRules]);
        setSavedConfig(cloneWarningConfig(mapped.state));
        setSavedExtraRules([...mapped.extraRules]);
        const persisted = Boolean(response.hasPersistedWarningsConfig);
        setHasPersistedConfig(persisted);
        setIsEditing(!persisted);
      } catch (error) {
        if (cancelled) return;
        setPanelError(error instanceof Error ? error.message : "Failed to load warning config.");
        setHasPersistedConfig(false);
        setIsEditing(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  const configPreview = useMemo<ProjectWarningsConfig>(() => {
    const knownRules: ProjectWarningRuleConfig[] = [
      {
        key: "LOW_ATTENDANCE",
        enabled: config.attendance.enabled,
        severity: config.attendance.severity,
        params: {
          minPercent: config.attendance.minPercent,
          lookbackDays: config.attendance.lookbackDays,
        },
      },
      {
        key: "MEETING_FREQUENCY",
        enabled: config.meetingFrequency.enabled,
        severity: config.meetingFrequency.severity,
        params: {
          minPerWeek: config.meetingFrequency.minPerWeek,
          lookbackDays: config.meetingFrequency.lookbackDays,
        },
      },
      {
        key: "LOW_CONTRIBUTION_ACTIVITY",
        enabled: config.contributionActivity.enabled,
        severity: config.contributionActivity.severity,
        params: {
          minCommits: config.contributionActivity.minCommits,
          lookbackDays: config.contributionActivity.lookbackDays,
        },
      },
    ];

    return {
      version: 1,
      rules: [...knownRules, ...extraRules],
    };
  }, [config, extraRules]);

  const isBusy = isLoading || isSaving;
  const formDisabled = isBusy || !isEditing;

  const closeModal = () => {
    if (isSaving) return;
    setIsOpen(false);
    setPanelMessage(null);
    setPanelError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setPanelError(null);
    setPanelMessage(null);
    try {
      const response = await updateStaffProjectWarningsConfig(projectId, configPreview);
      const mapped = mapApiConfigToState(response.warningsConfig);
      setConfig(cloneWarningConfig(mapped.state));
      setExtraRules([...mapped.extraRules]);
      setSavedConfig(cloneWarningConfig(mapped.state));
      setSavedExtraRules([...mapped.extraRules]);
      setHasPersistedConfig(true);
      setIsEditing(false);
      setPanelMessage("Warning config saved.");
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : "Failed to save warning config.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPanelMessage(null);
    setPanelError(null);

    if (!isEditing) {
      closeModal();
      return;
    }

    if (!hasPersistedConfig) {
      closeModal();
      return;
    }

    setConfig(cloneWarningConfig(savedConfig));
    setExtraRules([...savedExtraRules]);
    setIsEditing(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setPanelMessage(null);
          setPanelError(null);
          setIsOpen(true);
        }}
      >
        Configure warnings
      </Button>

      {isOpen ? (
        <div
          className="staff-projects__config-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <section
            className="staff-projects__config-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-project-warning-config-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="staff-projects__config-modal-head">
              <h3 id="staff-project-warning-config-title" style={{ margin: 0 }}>
                Configure warnings for project {projectId}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSaving}>
                Close
              </Button>
            </header>

            <div className="staff-projects__config-modal-body">
              <p className="muted" style={{ margin: 0 }}>
                Set project-level warning rules that apply to all teams.
              </p>
              {isLoading ? <p className="muted" style={{ margin: 0 }}>Loading config...</p> : null}
              {!isLoading && !isEditing ? (
                <p className="muted" style={{ margin: 0 }}>
                  Config is in view mode. Click <strong>Edit config</strong> to make changes.
                </p>
              ) : null}

              <div className="staff-projects__warning-rule-grid">
                <article className="staff-projects__warning-rule-card">
                  <div className="staff-projects__warning-rule-head">
                    <h4 style={{ margin: 0 }}>Meeting attendance</h4>
                    <label className="staff-projects__warning-toggle">
                      <input
                        type="checkbox"
                        checked={config.attendance.enabled}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            attendance: { ...prev.attendance, enabled: event.target.checked },
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="staff-projects__warning-rule-fields">
                    <label className="staff-projects__warning-field">
                      <span>Severity</span>
                      <select
                        value={config.attendance.severity}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            attendance: {
                              ...prev.attendance,
                              severity: event.target.value as WarningRuleSeverity,
                            },
                          }))
                        }
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </label>
                    <label className="staff-projects__warning-field">
                      <span>Minimum attendance (%)</span>
                      <select
                        value={config.attendance.minPercent}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            attendance: { ...prev.attendance, minPercent: Number(event.target.value) },
                          }))
                        }
                      >
                        {[20, 25, 30, 35, 40, 50, 60, 70].map((value) => (
                          <option key={value} value={value}>
                            {value}%
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="staff-projects__warning-field">
                      <span>Lookback window</span>
                      <select
                        value={config.attendance.lookbackDays}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            attendance: { ...prev.attendance, lookbackDays: Number(event.target.value) },
                          }))
                        }
                      >
                        {[7, 14, 21, 30].map((value) => (
                          <option key={value} value={value}>
                            Last {value} days
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>

                <article className="staff-projects__warning-rule-card">
                  <div className="staff-projects__warning-rule-head">
                    <h4 style={{ margin: 0 }}>Meeting frequency</h4>
                    <label className="staff-projects__warning-toggle">
                      <input
                        type="checkbox"
                        checked={config.meetingFrequency.enabled}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            meetingFrequency: { ...prev.meetingFrequency, enabled: event.target.checked },
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="staff-projects__warning-rule-fields">
                    <label className="staff-projects__warning-field">
                      <span>Severity</span>
                      <select
                        value={config.meetingFrequency.severity}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            meetingFrequency: {
                              ...prev.meetingFrequency,
                              severity: event.target.value as WarningRuleSeverity,
                            },
                          }))
                        }
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </label>
                    <label className="staff-projects__warning-field">
                      <span>Minimum meetings per week</span>
                      <select
                        value={config.meetingFrequency.minPerWeek}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            meetingFrequency: { ...prev.meetingFrequency, minPerWeek: Number(event.target.value) },
                          }))
                        }
                      >
                        {[0, 1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="staff-projects__warning-field">
                      <span>Lookback window</span>
                      <select
                        value={config.meetingFrequency.lookbackDays}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            meetingFrequency: { ...prev.meetingFrequency, lookbackDays: Number(event.target.value) },
                          }))
                        }
                      >
                        {[14, 21, 28, 35].map((value) => (
                          <option key={value} value={value}>
                            Last {value} days
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>

                <article className="staff-projects__warning-rule-card">
                  <div className="staff-projects__warning-rule-head">
                    <h4 style={{ margin: 0 }}>Contribution activity</h4>
                    <label className="staff-projects__warning-toggle">
                      <input
                        type="checkbox"
                        checked={config.contributionActivity.enabled}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            contributionActivity: { ...prev.contributionActivity, enabled: event.target.checked },
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="staff-projects__warning-rule-fields">
                    <label className="staff-projects__warning-field">
                      <span>Severity</span>
                      <select
                        value={config.contributionActivity.severity}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            contributionActivity: {
                              ...prev.contributionActivity,
                              severity: event.target.value as WarningRuleSeverity,
                            },
                          }))
                        }
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </label>
                    <label className="staff-projects__warning-field">
                      <span>Minimum commits</span>
                      <select
                        value={config.contributionActivity.minCommits}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            contributionActivity: { ...prev.contributionActivity, minCommits: Number(event.target.value) },
                          }))
                        }
                      >
                        {[0, 2, 4, 6, 8, 10, 12].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="staff-projects__warning-field">
                      <span>Lookback window</span>
                      <select
                        value={config.contributionActivity.lookbackDays}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            contributionActivity: { ...prev.contributionActivity, lookbackDays: Number(event.target.value) },
                          }))
                        }
                      >
                        {[7, 14, 21, 28].map((value) => (
                          <option key={value} value={value}>
                            Last {value} days
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              </div>

              <div className="staff-projects__warning-config-preview">
                <p className="staff-projects__team-count" style={{ margin: 0 }}>
                  Draft config preview
                </p>
                <pre>{JSON.stringify(configPreview, null, 2)}</pre>
              </div>

              {panelMessage ? <p className="muted" style={{ margin: 0 }}>{panelMessage}</p> : null}
              {panelError ? <p className="error" style={{ margin: 0 }}>{panelError}</p> : null}
            </div>

            <footer className="staff-projects__config-modal-actions">
              {isEditing ? (
                <>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={() => void handleSave()} disabled={formDisabled}>
                    {isSaving ? "Saving..." : "Save warnings"}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSaving}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setPanelMessage(null);
                      setPanelError(null);
                      setIsEditing(true);
                    }}
                    disabled={isBusy}
                  >
                    Edit config
                  </Button>
                </>
              )}
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
