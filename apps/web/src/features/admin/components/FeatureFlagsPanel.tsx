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
      <div key={`${flag.key}-action`} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-start" }}>
        <span className={statusClass}>{statusLabel}</span>
        <Button
          type="button"
          variant={flag.enabled ? "ghost" : "primary"}
          onClick={() => onToggle(flag.key, nextState)}
          disabled={busy}
          style={{ padding: "8px 12px", minWidth: 110 }}
        >
          {busy ? "Saving..." : flag.enabled ? "Disable" : "Enable"}
        </Button>
      </div>,
    ];
  });

  return (
    <Card title="Feature flags">
      <Table headers={["Feature", "Status"]} rows={rows} />
    </Card>
  );
}