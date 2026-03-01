import { redirect } from "next/navigation";
import { Placeholder } from "@/shared/ui/Placeholder";
import { ModuleList } from "@/features/modules/components/ModuleList";
import { ensureFeatureEnabled } from "@/shared/featureFlags";

export default async function ModulesPage() {
  const map = await ensureFeatureEnabled("modules");
  if (!map["modules"]) redirect("/dashboard");

  return (
    <div className="stack">
      <Placeholder title="Modules" path="/modules" description="List and manage course modules." />
      <ModuleList />
    </div>
  );
}
