import { Card } from "@/shared/ui/Card";
import { Placeholder } from "@/shared/ui/Placeholder";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

export default async function StaffIntegrationsPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="stack">
      <Placeholder
        title="Integrations"
        path="/staff/integrations"
        description="GitHub contributions and Trello activity."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <Card title="GitHub activity">
          <p className="muted">Contribution map and repo activity stream placeholder.</p>
        </Card>
        <Card title="Trello activity">
          <p className="muted">Live card movement feed placeholder.</p>
        </Card>
      </div>
    </div>
  );
}
