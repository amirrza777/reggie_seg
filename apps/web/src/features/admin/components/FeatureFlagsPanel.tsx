import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { Button } from "@/shared/ui/Button";
import type { FeatureFlag } from "../types";

type FeatureFlagsPanelProps = {
  flags: FeatureFlag[];
  onToggle: (key: string, enabled: boolean) => void;
  updating: Record<string, boolean>;
};

export function FeatureFlagsPanel({ flags, onToggle, updating }: FeatureFlagsPanelProps) {
  const rows = flags.map((flag) => {
    const busy = updating[flag.key];
    const nextState = !flag.enabled;
    const statusLabel = flag.enabled ? "Enabled" : "Disabled";
    const statusClass = flag.enabled ? "status-chip status-chip--success" : "status-chip status-chip--danger";
    return [
      flag.label,
      <div key={`${flag.key}-action`} className="feature-flag-action">
        <span className={statusClass}>{statusLabel}</span>
        <Button
          type="button"
          variant={flag.enabled ? "ghost" : "primary"}
          size="sm"
          onClick={() => onToggle(flag.key, nextState)}
          disabled={busy}
          className="feature-flag-action__btn"
        >
          {busy ? "Saving..." : flag.enabled ? "Disable" : "Enable"}
        </Button>
      </div>,
    ];
  });

  return (
    <Card title="Feature flags">
      <Table
        headers={["Feature", "Status"]}
        rows={rows}
        className="feature-flags-table"
        rowClassName="feature-flags-table__row"
        columnTemplate="minmax(0, 1.2fr) minmax(0, 1fr)"
      />
    </Card>
  );
}
