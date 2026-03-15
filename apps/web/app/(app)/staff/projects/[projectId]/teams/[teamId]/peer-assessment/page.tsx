import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffPeerAssessmentSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  const { user, project, team } = ctx;

  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let detailError: string | null = null;
  try {
    const detailData = await getTeamDetails(user.id, project.moduleId, team.id);
    students = detailData.students;
  } catch (error) {
    detailError = error instanceof Error ? error.message : "Failed to load peer assessment data.";
  }

  return (
    <section className="staff-projects__team-card">
      <h3 style={{ margin: 0 }}>Assessment progress by student</h3>
      <p className="muted" style={{ margin: 0 }}>
        This section is view-only for peer-assessment completion. No grading actions are available here.
      </p>
      {detailError ? <p className="muted" style={{ marginTop: 8 }}>{detailError}</p> : null}
      {!detailError && students.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>
          No student allocation data is available for this team yet.
        </p>
      ) : null}
      {!detailError && students.length > 0 ? (
        <ProgressCardGrid
          items={students}
          getHref={(item) =>
            item.id == null ? undefined : `/staff/projects/${project.id}/teams/${team.id}/peer-assessment/${item.id}`
          }
        />
      ) : null}
    </section>
  );
}
