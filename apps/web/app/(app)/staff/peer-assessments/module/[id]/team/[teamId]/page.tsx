/* Staff can see peer assessment progress for students in a given team (for one of their modules) */

import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { ApiError } from "@/shared/api/errors";

type PageProps = {
  params: Promise<{ id: string; teamId: string }>;
};

// TODO: get staffId from authentication
async function getStaffId(): Promise<number> {
  return 1;
}

export default async function TeamPage({ params }: PageProps) {
  const { id: moduleIdParam, teamId: teamIdParam } = await params;
  const moduleId = parseInt(moduleIdParam);
  const teamId = parseInt(teamIdParam);
  const staffId = await getStaffId();

  let moduleInfo: Awaited<ReturnType<typeof getTeamDetails>>["module"] | null = null;
  let teamInfo: Awaited<ReturnType<typeof getTeamDetails>>["team"] | null = null;
  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let errorMessage: string | null = null;

  try {
    const data = await getTeamDetails(staffId, moduleId, teamId);
    moduleInfo = data.module;
    teamInfo = data.team;
    students = data.students;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      errorMessage =
        "You are not a module lead for this module, or the team was not found. You don’t have permission to view this page.";
    } else {
      errorMessage = "Something went wrong loading this team. Please try again.";
    }
  }

  if (errorMessage || !moduleInfo || !teamInfo) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <Placeholder
        title={`${moduleInfo.title} – ${teamInfo.title}`}
        path={`/staff/peer-assessments/module/${moduleIdParam}/team/${teamIdParam}`}
        description="Peer assessment progress for students in this team."
      />
      <ProgressCardGrid
        items={students}
        getHref={(item) =>
          `/staff/peer-assessments/module/${moduleIdParam}/team/${teamIdParam}/student/${item.id ?? ""}`
        }
      />
    </div>
  );
}
