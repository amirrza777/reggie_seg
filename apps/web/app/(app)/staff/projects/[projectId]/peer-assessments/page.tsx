import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectPeerAssessmentOverview, getStaffTeamDeadline } from "@/features/projects/api/client";
import { StaffPeerAssessmentDeadlineRow } from "@/features/staff/projects/components/StaffPeerAssessmentDeadlineRow";
import { buildStaffPeerAssessmentDeadlineDisplay } from "@/features/staff/projects/lib/staffPeerAssessmentDeadlineDisplay";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/progress/ProgressCardGrid";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectPeerAssessmentsPage({ params }: PageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const enc = encodeURIComponent(projectId);

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const overview = await getStaffProjectPeerAssessmentOverview(numericProjectId);

  const teamsWithDeadlines =
    overview.teams.length === 0
      ? []
      : await Promise.all(
          overview.teams.map(async (team) => {
            let display = null;
            try {
              const teamDeadline = await getStaffTeamDeadline(user.id, numericProjectId, team.id);
              display = buildStaffPeerAssessmentDeadlineDisplay(teamDeadline.effectiveDeadline);
            } catch {
              display = null;
            }
            return {
              ...team,
              deadlineDetail: <StaffPeerAssessmentDeadlineRow display={display} />,
            };
          }),
        );

  const template = overview.questionnaireTemplate;
  const templateLabel = template?.templateName ?? "No questionnaire selected";
  const templateViewHref =
    template != null ? `/staff/questionnaires/${encodeURIComponent(String(template.id))}` : null;
  const manageHref = `/staff/projects/${enc}/manage`;
  const templateChangeDisabled =
    overview.canManageProjectSettings === true && overview.hasSubmittedPeerAssessments === true;

  return (
    <div className="stack ui-page">
      <Placeholder
        title={`${overview.project.name} — peer assessments`}
        description="Progress overview for each team in this project."
      />

      <section className="stack" aria-label="Questionnaire template">
        <div className="ui-toolbar ui-toolbar--between" style={{ alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <p className="muted" style={{ margin: 0 }}>
            <strong>Questionnaire template:</strong>{" "}
            {templateViewHref ? (
              <Link href={templateViewHref} className="ui-link">
                {templateLabel}
              </Link>
            ) : (
              templateLabel
            )}
          </p>
          <div
            style={{
              flex: "0 0 auto",
              marginLeft: "auto",
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              maxWidth: "min(100%, 22rem)",
            }}
          >
            {overview.canManageProjectSettings ? (
              templateChangeDisabled ? (
                <>
                  <button type="button" className="btn btn--sm btn--primary" disabled>
                    Change template
                  </button>
                  <span className="ui-note ui-note--muted" style={{ margin: 0 }}>
                    Locked after peer assessments have been submitted.
                  </span>
                </>
              ) : (
                <Link href={manageHref} className="btn btn--sm btn--primary">
                  Change template
                </Link>
              )
            ) : (
              <span className="muted" style={{ display: "inline-block", maxWidth: "22rem" }}>
                Only the module lead can change the template.
              </span>
            )}
          </div>
        </div>
      </section>

      {teamsWithDeadlines.length === 0 ? (
        <p className="muted">No active teams are currently set up for this project.</p>
      ) : (
        <ProgressCardGrid
          items={teamsWithDeadlines}
          getHref={(item) =>
            item.id == null
              ? undefined
              : `/staff/projects/${enc}/teams/${encodeURIComponent(String(item.id))}/peer-assessment`
          }
        />
      )}
    </div>
  );
}
