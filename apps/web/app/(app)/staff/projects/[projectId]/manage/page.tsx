import { getStaffProjectManage } from "@/features/projects/api/client";
import { StaffProjectManageSetupSections } from "@/features/staff/projects/components/manage/StaffProjectManageSetupSections";
import { getProjectWarningsConfig } from "@/features/staff/projects/warnings/api/client";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectManagePageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectManagePage({ params }: StaffProjectManagePageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const summary = await getStaffProjectManage(numericProjectId);

  const warningsResult = await getProjectWarningsConfig(numericProjectId)
    .then((data) => ({ ok: true as const, data }))
    .catch(() => ({ ok: false as const }));

  const overviewHref = `/staff/projects/${encodeURIComponent(projectId)}`;
  const discussionHref = `/staff/projects/${encodeURIComponent(projectId)}/discussion`;
  const warningsTabHref = `/staff/projects/${encodeURIComponent(projectId)}/warnings`;

  return (
    <StaffProjectManageSetupSections
      projectId={numericProjectId}
      initial={summary}
      warningsOk={warningsResult.ok}
      warningsConfig={warningsResult.ok ? warningsResult.data.warningsConfig : null}
      overviewHref={overviewHref}
      discussionHref={discussionHref}
      warningsTabHref={warningsTabHref}
    />
  );
}
