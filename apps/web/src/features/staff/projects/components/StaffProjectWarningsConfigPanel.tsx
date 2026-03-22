"use client";

import { useEffect, useMemo, useState, type FocusEvent } from "react";
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
  projectName?: string;
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
    lookbackDays: 30,
  },
  contributionActivity: {
    enabled: false,
    severity: "MEDIUM",
    minCommits: 4,
    lookbackDays: 14,
  },
};

const LOOKBACK_WINDOW_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: -1, label: "Since project start" },
] as const;

function normalizeLookbackWindow(value: number): number {
  if (value === -1) return -1;
  if (value <= 7) return 7;
  if (value <= 14) return 14;
  if (value <= 30) return 30;
  return -1;
}

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

function clampPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(100, value));
}

function clampNonNegative(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function normalizeAttendancePercentInput(rawValue: string, fallback: number) {
  const parsed = Number(rawValue);
  return clampPercent(parsed, fallback);
}

function replaceZeroOnFocus(event: FocusEvent<HTMLInputElement>) {
  if (event.currentTarget.value === "0") {
    event.currentTarget.select();
  }
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
      state.attendance.minPercent = clampPercent(
        toNumber(params.minPercent, state.attendance.minPercent),
        state.attendance.minPercent,
      );
      state.attendance.lookbackDays = normalizeLookbackWindow(
        toNumber(params.lookbackDays, state.attendance.lookbackDays),
      );
      continue;
    }

    if (rule.key === "MEETING_FREQUENCY") {
      state.meetingFrequency.enabled = rule.enabled;
      state.meetingFrequency.severity = toSeverity(rule.severity, state.meetingFrequency.severity);
      state.meetingFrequency.minPerWeek = clampNonNegative(
        toNumber(params.minPerWeek, state.meetingFrequency.minPerWeek),
        state.meetingFrequency.minPerWeek,
      );
      state.meetingFrequency.lookbackDays = normalizeLookbackWindow(
        toNumber(params.lookbackDays, state.meetingFrequency.lookbackDays),
      );
      continue;
    }

    if (rule.key === "LOW_CONTRIBUTION_ACTIVITY" || rule.key === "LOW_COMMIT_ACTIVITY") {
      state.contributionActivity.enabled = rule.enabled;
      state.contributionActivity.severity = toSeverity(rule.severity, state.contributionActivity.severity);
      state.contributionActivity.minCommits = clampNonNegative(
        toNumber(params.minCommits, state.contributionActivity.minCommits),
        state.contributionActivity.minCommits,
      );
      state.contributionActivity.lookbackDays = normalizeLookbackWindow(
        toNumber(params.lookbackDays, state.contributionActivity.lookbackDays),
      );
      continue;
    }

    extraRules.push(rule);
  }

  return { state, extraRules };
}

export function StaffProjectWarningsConfigPanel({
  projectId,
  projectName,
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
  const [attendancePercentInput, setAttendancePercentInput] = useState(
    String(DEFAULT_WARNING_CONFIG.attendance.minPercent),
  );

  useEffect(() => {
    setAttendancePercentInput(String(config.attendance.minPercent));
  }, [config.attendance.minPercent]);

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
          minPercent: normalizeAttendancePercentInput(attendancePercentInput, config.attendance.minPercent),
          lookbackDays: config.attendance.lookbackDays,
        },
      },
      {
        key: "MEETING_FREQUENCY",
        enabled: config.meetingFrequency.enabled,
        severity: config.meetingFrequency.severity,
        params: {
          minPerWeek: clampNonNegative(config.meetingFrequency.minPerWeek, DEFAULT_WARNING_CONFIG.meetingFrequency.minPerWeek),
          lookbackDays: config.meetingFrequency.lookbackDays,
        },
      },
      {
        key: "LOW_CONTRIBUTION_ACTIVITY",
        enabled: config.contributionActivity.enabled,
        severity: config.contributionActivity.severity,
        params: {
          minCommits: clampNonNegative(config.contributionActivity.minCommits, DEFAULT_WARNING_CONFIG.contributionActivity.minCommits),
          lookbackDays: config.contributionActivity.lookbackDays,
        },
      },
    ];

    return {
      version: 1,
      rules: [...knownRules, ...extraRules],
    };
  }, [config, extraRules, attendancePercentInput]);

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
      const normalizedAttendancePercent = normalizeAttendancePercentInput(
        attendancePercentInput,
        config.attendance.minPercent,
      );
      setConfig((prev) => ({
        ...prev,
        attendance: {
          ...prev.attendance,
          minPercent: normalizedAttendancePercent,
        },
      }));
      setAttendancePercentInput(String(normalizedAttendancePercent));

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
                Configure warnings for {projectName?.trim() || `project ${projectId}`}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSaving}>
                Close
              </Button>
            </header>

            <div className="staff-projects__config-modal-body">
              <p className="muted" style={{ margin: 0 }}>
                Set project-level warning rules that apply to all teams.
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Warnings are sent automatically to teams to help them stay on track and avoid project behaviours that can reduce delivery quality.
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
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={attendancePercentInput}
                        disabled={formDisabled}
                        onFocus={replaceZeroOnFocus}
                        onChange={(event) => setAttendancePercentInput(event.currentTarget.value)}
                        onBlur={() => {
                          const normalized = normalizeAttendancePercentInput(
                            attendancePercentInput,
                            config.attendance.minPercent,
                          );
                          setConfig((prev) => ({
                            ...prev,
                            attendance: {
                              ...prev.attendance,
                              minPercent: normalized,
                            },
                          }));
                          setAttendancePercentInput(String(normalized));
                        }}
                      />
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
                        {LOOKBACK_WINDOW_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
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
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={config.meetingFrequency.minPerWeek}
                        disabled={formDisabled}
                        onFocus={replaceZeroOnFocus}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.valueAsNumber;
                          setConfig((prev) => ({
                            ...prev,
                            meetingFrequency: {
                              ...prev.meetingFrequency,
                              minPerWeek: clampNonNegative(nextValue, 0),
                            },
                          }));
                        }}
                      />
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
                        {LOOKBACK_WINDOW_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
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
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={config.contributionActivity.minCommits}
                        disabled={formDisabled}
                        onFocus={replaceZeroOnFocus}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.valueAsNumber;
                          setConfig((prev) => ({
                            ...prev,
                            contributionActivity: {
                              ...prev.contributionActivity,
                              minCommits: clampNonNegative(nextValue, 0),
                            },
                          }));
                        }}
                      />
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
                        {LOOKBACK_WINDOW_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
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
