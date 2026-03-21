"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";

type StaffProjectWarningsConfigPanelProps = {
  projectId: number;
};

type WarningSeverity = "LOW" | "MEDIUM" | "HIGH";

type WarningConfigState = {
  attendance: {
    enabled: boolean;
    severity: WarningSeverity;
    minPercent: number;
    lookbackDays: number;
  };
  meetingFrequency: {
    enabled: boolean;
    severity: WarningSeverity;
    minPerWeek: number;
    lookbackDays: number;
  };
  contributionActivity: {
    enabled: boolean;
    severity: WarningSeverity;
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

export function StaffProjectWarningsConfigPanel({
  projectId,
}: StaffProjectWarningsConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WarningConfigState>(DEFAULT_WARNING_CONFIG);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const configPreview = useMemo(
    () => ({
      version: 1,
      rules: [
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
      ],
    }),
    [config],
  );

  const closeModal = () => {
    setIsOpen(false);
    setPanelMessage(null);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setPanelMessage(null);
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
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                Close
              </Button>
            </header>

            <div className="staff-projects__config-modal-body">
              <p className="muted" style={{ margin: 0 }}>
                Set project-level warning rules that apply to all teams.
              </p>

              <div className="staff-projects__warning-rule-grid">
                <article className="staff-projects__warning-rule-card">
                  <div className="staff-projects__warning-rule-head">
                    <h4 style={{ margin: 0 }}>Meeting attendance</h4>
                    <label className="staff-projects__warning-toggle">
                      <input
                        type="checkbox"
                        checked={config.attendance.enabled}
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
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            attendance: {
                              ...prev.attendance,
                              severity: event.target.value as WarningSeverity,
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
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            meetingFrequency: {
                              ...prev.meetingFrequency,
                              severity: event.target.value as WarningSeverity,
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
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            contributionActivity: {
                              ...prev.contributionActivity,
                              severity: event.target.value as WarningSeverity,
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
            </div>

            <footer className="staff-projects__config-modal-actions">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => {
                  setConfig(DEFAULT_WARNING_CONFIG);
                  setPanelMessage("Defaults restored.");
                }}
              >
                Reset defaults
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setPanelMessage("Warning configuration saved as a local draft. API save is next.")}
              >
                Save draft
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
