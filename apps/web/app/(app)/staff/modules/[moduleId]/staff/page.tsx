import Link from "next/link";
import { redirect } from "next/navigation";
import { getModuleStaffList } from "@/features/modules/api/client";
import type { ModuleStaffListMember } from "@/features/modules/types";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
import { ApiError } from "@/shared/api/errors";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

function roleLabels(roles: ModuleStaffListMember["roles"]): string {
  const parts: string[] = [];
  if (roles.includes("LEAD")) parts.push("Module lead");
  if (roles.includes("TA")) parts.push("Teaching assistant");
  return parts.join(" · ") || "—";
}

export default async function StaffModuleStaffListPage({ params }: PageProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const enc = encodeURIComponent(moduleId);
  const access = resolveStaffModuleWorkspaceAccess(ctx);

  let members: ModuleStaffListMember[] | null = null;
  let denied = false;

  try {
    const res = await getModuleStaffList(moduleId);
    members = res.members;
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      denied = true;
    } else {
      members = [];
    }
  }

  return (
    <div className="stack module-workspace-staff">
      <h2 className="overview-title">Staff members</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Module leads and teaching assistants with access to this module.
      </p>

      {access.staffModuleSetup || access.enterpriseModuleEditor ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {access.staffModuleSetup ? (
            <Link href={`/staff/modules/${enc}/staff/access`} className="btn btn--primary btn--sm">
              Manage staff access
            </Link>
          ) : null}
          {access.enterpriseModuleEditor ? (
            <Link href={`/enterprise/modules/${enc}/edit`} className="btn btn--ghost btn--sm">
              Enterprise module editor
            </Link>
          ) : null}
        </div>
      ) : null}

      {denied ? (
        <Card title="List">
          <p className="muted">You don&apos;t have permission to view this list.</p>
        </Card>
      ) : members && members.length === 0 ? (
        <Card title="Staff list">
          <p className="muted">No module leads or teaching assistants are assigned yet.</p>
          {access.staffModuleSetup || access.enterpriseModuleEditor ? (
            <p className="muted" style={{ marginTop: 8 }}>
              {access.staffModuleSetup ? (
                <>
                  Assign leads and TAs in{" "}
                  <Link href={`/staff/modules/${enc}/manage`} className="ui-link">
                    module setup
                  </Link>
                  {access.enterpriseModuleEditor ? (
                    <>
                      {" "}
                      or the{" "}
                      <Link href={`/enterprise/modules/${enc}/edit`} className="ui-link">
                        enterprise module editor
                      </Link>
                    </>
                  ) : null}
                  .
                </>
              ) : (
                <>
                  Assign leads and TAs in the{" "}
                  <Link href={`/enterprise/modules/${enc}/edit`} className="ui-link">
                    enterprise module editor
                  </Link>
                  .
                </>
              )}
            </p>
          ) : null}
        </Card>
      ) : members && members.length > 0 ? (
        <Card title="Module leads and teaching assistants">
          <Table
            headers={["Name", "Email", "Roles"]}
            rows={members.map((m) => [m.displayName, m.email, roleLabels(m.roles)])}
            columnTemplate="1.2fr 1.4fr 1fr"
          />
        </Card>
      ) : (
        <Card title="Staff list">
          <p className="muted">Could not load the staff list. Please try again later.</p>
        </Card>
      )}
    </div>
  );
}
