import type { WarningRuleSeverity } from "@/features/projects/types";
import { LOOKBACK_WINDOW_OPTIONS } from "../types";

type WarningRuleCardProps = {
  title: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;

  severity: WarningRuleSeverity;
  onSeverityChange: (next: WarningRuleSeverity) => void;

  thresholdLabel: string;
  thresholdValue: number;
  onThresholdChange: (next: number) => void;
  thresholdMin?: number;
  thresholdMax?: number;
  thresholdStep?: number;

  lookbackDays: number;
  onLookbackDaysChange: (next: number) => void;

  disabled?: boolean;
};

export function WarningRuleCard({
  title,
  enabled,
  onEnabledChange,
  severity,
  onSeverityChange,
  thresholdLabel,
  thresholdValue,
  onThresholdChange,
  thresholdMin = 0,
  thresholdMax = 100,
  thresholdStep = 1,
  lookbackDays,
  onLookbackDaysChange,
  disabled = false,
}: WarningRuleCardProps) {
  const cardClass = [
    "staff-projects__warning-rule-card",
    enabled ? "staff-projects__warning-rule-card--active" : "staff-projects__warning-rule-card--inactive",
  ].join(" ");

  return (
    <article className={cardClass}>
      <div className="staff-projects__warning-rule-head">
        <h4 style={{ margin: 0 }}>{title}</h4>
        <label className="staff-projects__warning-toggle">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div className="staff-projects__warning-rule-fields">
        <label className="staff-projects__warning-field">
          <span>Severity</span>
          <select
            value={severity}
            disabled={disabled}
            onChange={(e) => onSeverityChange(e.target.value as WarningRuleSeverity)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>

        <label className="staff-projects__warning-field">
          <span>{thresholdLabel}</span>
          <input
            type="number"
            min={thresholdMin}
            max={thresholdMax}
            step={thresholdStep}
            value={thresholdValue}
            disabled={disabled}
            onChange={(e) => onThresholdChange(Number(e.currentTarget.value) || thresholdMin)}
          />
        </label>

        <label className="staff-projects__warning-field">
          <span>Lookback window</span>
          <select
            value={lookbackDays}
            disabled={disabled}
            onChange={(e) => onLookbackDaysChange(Number(e.target.value))}
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
  );
}

