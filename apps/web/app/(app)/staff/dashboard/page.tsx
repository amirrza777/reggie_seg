import Link from "next/link";
import type { ReactElement } from "react";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { Card } from "@/shared/ui/Card";
import { Placeholder } from "@/shared/ui/Placeholder";
import { Table } from "@/shared/ui/Table";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

type StaffModuleRow = [string, ReactElement, string, string];

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const moduleData = await loadStaffModules(user.id);
  const moduleRows = buildModuleRows(moduleData.modules);

  return (
    <div className="stack ui-page">
      <Placeholder
        title="Staff Overview"
        titleClassName="overview-title"
        description="Open a module, then its projects and teams for peer assessment, peer feedback, repositories, and grading."
      />
      <StaffModulesCard moduleError={moduleData.moduleError} modules={moduleData.modules} moduleRows={moduleRows} />
      <StaffNavigationCards />
    </div>
  );
}

async function loadStaffModules(userId: number): Promise<{ modules: Module[]; moduleError: string | null }> {
  try {
    const modules = await listModules(userId, { scope: "staff" });
    return { modules, moduleError: null };
  } catch {
    return { modules: [], moduleError: "Could not load your modules right now. Please try again." };
  }
}

function buildModuleRows(modules: Module[]): StaffModuleRow[] {
  return modules.map((module) => {
    const moduleCode = formatModuleCode(module);
    const teams = module.teamCount ?? 0;
    const projects = module.projectCount ?? 0;

    return [
      moduleCode,
      <Link key={module.id} href={`/modules/${encodeURIComponent(module.id)}`} className="ui-link-reset">
        {module.title}
      </Link>,
      `${teams} ${pluralize("team", teams)}`,
      `${projects} ${pluralize("project", projects)}`,
    ];
  });
}

function StaffModulesCard({
  moduleError,
  modules,
  moduleRows,
}: {
  moduleError: string | null;
  modules: Module[];
  moduleRows: StaffModuleRow[];
}) {
  return (
    <Card title="My Modules">
      {moduleError ? <p className="muted">{moduleError}</p> : null}
      {!moduleError && modules.length === 0 ? <p className="muted">No modules are currently assigned to your account.</p> : null}
      {!moduleError && modules.length > 0 ? <Table headers={["Code", "Module", "Teams", "Projects"]} rows={moduleRows} /> : null}
    </Card>
  );
}

function StaffNavigationCards() {
  return (
    <div className="stack stack--loose">
      <Card title="Team workspace">
        <p className="muted">Project and team-level workflows are under each module (Projects &amp; teams).</p>
        <StaffQuickLinks
          links={[
            { href: "/staff/modules", label: "My modules" },
            { href: "/staff/questionnaires", label: "Open questionnaires" },
          ]}
        />
      </Card>
      <Card title="Where to review delivery signals">
        <p className="muted">
          Delivery and engagement signals are available in dedicated team workspaces, GitHub insights, and Trello
          summaries.
        </p>
        <StaffQuickLinks
          links={[
            { href: "/staff/modules", label: "Browse modules & projects" },
            { href: "/staff/repos", label: "Repository analytics" },
            { href: "/staff/integrations", label: "Trello velocity" },
          ]}
        />
      </Card>
    </div>
  );
}

function StaffQuickLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="pill-nav__link">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function formatModuleCode(module: Module): string {
  if (module.code?.trim()) return module.code.trim();
  const numericId = Number(module.id);
  if (Number.isFinite(numericId)) return `MOD-${numericId}`;
  return module.id;
}

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}
