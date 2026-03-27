import Link from "next/link";
import { buildModuleDashboardData } from "../moduleDashboardData";
import { resolveStaffModuleWorkspaceAccess } from "../staffModuleWorkspaceAccess";
import type { StaffModuleWorkspaceContext } from "../staffModuleWorkspaceLayoutData";
import "@/features/staff/projects/styles/staff-projects.css";

function roleBadgeLabel(ctx: StaffModuleWorkspaceContext): string | null {
  const role = ctx.moduleRecord?.accountRole;
  if (role === "OWNER") return "Module lead";
  if (role === "TEACHING_ASSISTANT") return "Teaching assistant";
  if (role === "ADMIN_ACCESS") return "Admin access";
  if (ctx.isElevated && !ctx.moduleRecord) return "Elevated access";
  return null;
}

export function StaffModuleWorkspaceHero({ ctx }: { ctx: StaffModuleWorkspaceContext }) {
  const access = resolveStaffModuleWorkspaceAccess(ctx);
  const { moduleCode, projectCount } = buildModuleDashboardData(ctx.module);
  const roleLabel = roleBadgeLabel(ctx);
  const staffCount = ctx.module.staffWithAccessCount ?? 0;

  return (
    <section className="staff-projects__hero">
      <Link href="/staff/modules" className="staff-projects__eyebrow">All Modules</Link>
      <h1 className="staff-projects__title">{ctx.module.title}</h1>
      <p className="staff-projects__desc">
        Use the tabs to review expectations, projects and teams, staff access, grading progress, and settings.
      </p>
      <div className="staff-projects__meta">
        <span className="staff-projects__badge">
          {moduleCode} {" "} <strong>|</strong> {" "}
          {projectCount} project{projectCount === 1 ? "" : "s"} {" "} • {" "}
          {staffCount} staff member{staffCount === 1 ? "" : "s"} with access </span>
        {roleLabel ? <span className="staff-projects__badge">Your role: {roleLabel}</span> : null}
        
      </div>
    </section>
  );
}
