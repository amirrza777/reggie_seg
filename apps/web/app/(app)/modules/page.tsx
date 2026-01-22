import { Placeholder } from "@/shared/ui/Placeholder";
import { ModuleList } from "@/src/features/modules/components/ModuleList";

export default function ModulesPage() {
  return (
    <div className="stack">
      <Placeholder
        title="Modules"
        path="/modules"
        description="List and manage course modules."
      />
      <ModuleList />
    </div>
  );
}
