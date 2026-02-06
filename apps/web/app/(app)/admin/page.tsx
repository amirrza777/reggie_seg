/**
 * TODO: Admin landing page: placeholder, showing services status
 */
import { Placeholder } from "@/shared/ui/Placeholder";
import { FeatureFlagsPanel } from "@/features/admin/components/FeatureFlagsPanel";

export default function AdminPage() {
  return (
    <div className="stack">
      <Placeholder
        title="Admin"
        path="/admin"
        description="Administrative configuration and feature flags."
      />
      <FeatureFlagsPanel />
    </div>
  );
}
