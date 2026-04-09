import type { ProjectWarningRuleConfig } from "@/features/projects/types";
import type { WarningConfigState } from "../types";
import { LOOKBACK_WINDOW_OPTIONS } from "../types";

function lookbackLabel(days: number) {
  const match = LOOKBACK_WINDOW_OPTIONS.find((o) => o.value === days);
  return match?.label ?? `${days} days`;
}

type WarningRulesReadOnlySummaryProps = {
  state: WarningConfigState;
  extraRules?: ProjectWarningRuleConfig[];
};

export function WarningRulesReadOnlySummary({ state, extraRules = [] }: WarningRulesReadOnlySummaryProps) {
  const rows: { title: string; enabled: boolean; lines: string[] }[] = [
    {
      title: "Attendance",
      enabled: state.attendance.enabled,
      lines: [
        state.attendance.enabled ? "Enabled" : "Disabled",
        state.attendance.enabled
          ? `Severity ${state.attendance.severity}; minimum ${state.attendance.minPercent}% over ${lookbackLabel(state.attendance.lookbackDays)}`
          : "Not evaluated while disabled.",
      ],
    },
    {
      title: "Meeting frequency",
      enabled: state.meetingFrequency.enabled,
      lines: [
        state.meetingFrequency.enabled ? "Enabled" : "Disabled",
        state.meetingFrequency.enabled
          ? `Severity ${state.meetingFrequency.severity}; at least ${state.meetingFrequency.minPerWeek} meeting(s)/week over ${lookbackLabel(state.meetingFrequency.lookbackDays)}`
          : "Not evaluated while disabled.",
      ],
    },
    {
      title: "Contribution activity",
      enabled: state.contributionActivity.enabled,
      lines: [
        state.contributionActivity.enabled ? "Enabled" : "Disabled",
        state.contributionActivity.enabled
          ? `Severity ${state.contributionActivity.severity}; minimum ${state.contributionActivity.minCommits} commit(s) over ${lookbackLabel(state.contributionActivity.lookbackDays)}`
          : "Not evaluated while disabled.",
      ],
    },
  ];

  return (
    <div className="staff-project-warnings-readonly">
      <ul className="staff-project-warnings-readonly__list">
        {rows.map((row) => (
          <li
            key={row.title}
            className={
              row.enabled
                ? "staff-project-warnings-readonly__item staff-project-warnings-readonly__item--active"
                : "staff-project-warnings-readonly__item staff-project-warnings-readonly__item--disabled"
            }
          >
            <div className="staff-project-warnings-readonly__item-title">{row.title}</div>
            <div className="staff-project-warnings-readonly__item-body">
              {row.lines.map((line, i) => (
                <p key={i} className="ui-note ui-note--muted staff-project-warnings-readonly__line">
                  {line}
                </p>
              ))}
            </div>
          </li>
        ))}
        {extraRules.length > 0 ? (
          <li className="staff-project-warnings-readonly__item staff-project-warnings-readonly__item--extra-heading">
            <div className="staff-project-warnings-readonly__item-title">Additional rules</div>
            <ul className="staff-project-warnings-readonly__sublist">
              {extraRules.map((rule) => (
                <li
                  key={rule.key}
                  className={
                    rule.enabled
                      ? "staff-project-warnings-readonly__subitem staff-project-warnings-readonly__subitem--active"
                      : "staff-project-warnings-readonly__subitem staff-project-warnings-readonly__subitem--disabled"
                  }
                >
                  <p className="ui-note ui-note--muted staff-project-warnings-readonly__line">
                    <strong>{rule.key}</strong>: {rule.enabled ? "enabled" : "disabled"}
                    {rule.severity ? ` · ${rule.severity}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
