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
    <div className="stack module-dashboard">
      <header className="module-workspace__section-header">
        <h2 className="overview-title">Settings</h2>
        <p className="muted">
          Module setup, enterprise configuration, and shortcuts to projects &amp; teams.
        </p>
      </header>

      {access.staffModuleSetup ? (
        <Card title="Module setup" className="module-workspace__card">
          <p className="muted">Module text and expectations. Student enrollment is under Student members.</p>
          <div>
            <Link href={`/staff/modules/${enc}/manage`} className="btn btn--primary">
              Manage module
            </Link>
          </div>
        </Card>
      ) : null}

      {access.enterpriseModuleEditor ? (
        <Card title="Enterprise console" className="module-workspace__card">
          <p className="muted">Organisation-wide module configuration.</p>
          <div>
            <Link href={`/enterprise/modules/${enc}/edit`} className="btn btn--ghost">
              Open enterprise module editor
            </Link>
          </div>
        </Card>
      ) : null}

      <Card title="Projects & teams" className="module-workspace__card">
        <p className="muted">All projects in this module with expandable teams.</p>
        <div>
          <Link href={`/staff/modules/${enc}/projects`} className="btn btn--ghost">
            Open projects &amp; teams
          </Link>
        </div>
      </Card>

      {!access.staffModuleSetup && !access.enterpriseModuleEditor ? (
        <Card title="Settings" className="module-workspace__card">
          <p className="muted">Only module leads and administrators can change settings.</p>
        </Card>
      ) : null}
    </div>
  );
}
