import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
import { Card } from "@/shared/ui/Card";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleSettingsPage({ params }: PageProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const enc = encodeURIComponent(moduleId);
  const access = resolveStaffModuleWorkspaceAccess(ctx);

  return (
    <div className="stack module-workspace-settings">
      <h2 className="overview-title">Settings</h2>
      <p className="muted">
        Module setup, enterprise configuration, and shortcuts to projects &amp; teams.
      </p>

      <div className="stack">
        {access.staffModuleSetup ? (
          <Card title="Module setup">
            <p className="muted">Module text and expectations. Student enrollment is under Student members.</p>
            <p>
              <Link href={`/staff/modules/${enc}/manage`} className="btn btn--primary">
                Manage module
              </Link>
            </p>
          </Card>
        ) : null}

        {access.enterpriseModuleEditor ? (
          <Card title="Enterprise console">
            <p className="muted">Organisation-wide module configuration.</p>
            <p>
              <Link href={`/enterprise/modules/${enc}/edit`} className="btn btn--ghost">
                Open enterprise module editor
              </Link>
            </p>
          </Card>
        ) : null}

        <Card title="Projects & teams">
          <p className="muted">All projects in this module with expandable teams.</p>
          <p>
            <Link href={`/staff/modules/${enc}/projects`} className="btn btn--ghost">
              Open projects & teams
            </Link>
          </p>
        </Card>

        {!access.staffModuleSetup && !access.enterpriseModuleEditor ? (
          <Card title="Settings">
            <p className="muted">Only module leads and administrators can change settings.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
