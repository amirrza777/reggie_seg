import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import type { FeatureFlag } from "../types";

const demoFlags: FeatureFlag[] = [
  { key: "peer_feedback", label: "Peer feedback", enabled: true },
  { key: "modules", label: "Modules", enabled: true },
  { key: "repos", label: "Repos", enabled: false },
];

type FeatureFlagsPanelProps = {
  flags?: FeatureFlag[];
};

export function FeatureFlagsPanel({ flags = demoFlags }: FeatureFlagsPanelProps) {
  const rows = flags.map((flag) => [flag.label, flag.enabled ? "Enabled" : "Disabled"]);
  return (
    <Card title="Feature flags">
      <Table headers={["Feature", "Status"]} rows={rows} />
    </Card>
  );
}
