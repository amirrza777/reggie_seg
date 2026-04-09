import type { ReactNode } from "react";
import "@/features/staff/projects/styles/staff-projects.css";

const PROJECT_WORKSPACE_EYEBROW = "PROJECT";

/** Fixed hero copy, parallel to the staff module workspace hero. */
const PROJECT_WORKSPACE_DESCRIPTION =
  "Use the tabs to review project overview, team allocation, meetings, discussion, feature flags, warnings, and team workspaces.";

export type StaffProjectsWorkspacePageHeaderProps = {
  title: ReactNode;
  teamCount: number;
  studentCount: number;
  accessRoleLabel: string;
} & {
  eyebrow?: never;
  description?: never;
  extraMeta?: never;
};

/** Project workspace hero; intended for `staff/projects/[projectId]/layout.tsx` only. */
export function StaffProjectsWorkspacePageHeader({
  title,
  teamCount,
  studentCount,
  accessRoleLabel,
}: StaffProjectsWorkspacePageHeaderProps) {
  return (
    <section className="staff-projects__hero staff-projects__workspace-page-header">
      <p className="staff-projects__eyebrow">{PROJECT_WORKSPACE_EYEBROW}</p>
      <h1 className="staff-projects__title">{title}</h1>
      <p className="staff-projects__desc">{PROJECT_WORKSPACE_DESCRIPTION}</p>
      <div className="staff-projects__meta">
        <span className="staff-projects__badge">
          {teamCount} team{teamCount === 1 ? "" : "s"}
        </span>
        <span className="staff-projects__badge">
          {studentCount} student{studentCount === 1 ? "" : "s"}
        </span>
        <span className="staff-projects__badge">Your role: {accessRoleLabel}</span>
      </div>
    </section>
  );
}
