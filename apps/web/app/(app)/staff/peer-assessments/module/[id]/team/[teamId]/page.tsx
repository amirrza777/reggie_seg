/* Staff can see peer assessment progress for students in a given team (for one of their modules) */

import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffMarkingCard } from "@/features/staff/peerAssessments/components/StaffMarkingCard";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";

type PageProps = {
  params: Promise<{ id: string; teamId: string }>;
};

async function getStaffIdFromSession() {
  const user = await getCurrentUser();
  if (!user || (!user.isStaff && !user.isAdmin)) {
    throw new ApiError("You don’t have permission to view staff peer assessments.", { status: 403 });
  }
  return user.id;
}

export default async function TeamPage({ params }: PageProps) {
  const { id: moduleIdParam, teamId: teamIdParam } = await params;
  const moduleId = Number.parseInt(moduleIdParam, 10);
  const teamId = Number.parseInt(teamIdParam, 10);
  if (Number.isNaN(moduleId) || Number.isNaN(teamId)) {
    return (
      <div className="stack">
        <p className="muted">Invalid team route. Please open the team from the module list.</p>
      </div>
    );
  }
  let staffId: number | null = null;

  let moduleInfo: Awaited<ReturnType<typeof getTeamDetails>>["module"] | null = null;
  let teamInfo: Awaited<ReturnType<typeof getTeamDetails>>["team"] | null = null;
  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let teamMarking: Awaited<ReturnType<typeof getTeamDetails>>["teamMarking"] = null;
  let errorMessage: string | null = null;

  try {
    staffId = await getStaffIdFromSession();
    const data = await getTeamDetails(staffId, moduleId, teamId);
    moduleInfo = data.module;
    teamInfo = data.team;
    students = data.students;
    teamMarking = data.teamMarking;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      errorMessage = "You don’t have permission to view staff peer assessments.";
    } else if (error instanceof ApiError && error.status === 404) {
      errorMessage = "This team was not found in the selected module.";
    } else {
      errorMessage = "Something went wrong loading this team. Please try again.";
    }
  }

  if (errorMessage || !moduleInfo || !teamInfo || staffId == null) {
    return (
      <div className="stack ui-page">
        <p className="muted">{errorMessage}</p>
      </div>
    );
  }

  const markingReadOnly = Boolean(moduleInfo.archivedAt);

  return (
    <div className="stack ui-page">
      <Placeholder
        title={`${moduleInfo.title} – ${teamInfo.title}`}
        description="Peer assessment progress for students in this team."
      />
      {students.length === 0 ? (
        <p className="muted">No students are currently allocated to this team.</p>
      ) : (
        <ProgressCardGrid
          items={students}
          getHref={(item) => {
            if (item.id == null) return undefined;
            return `/staff/peer-assessments/module/${moduleIdParam}/team/${teamIdParam}/student/${item.id}`;
          }}
        />
      )}

      <StaffMarkingCard
        title="Team marking and formative feedback"
        description="Set a shared team mark and formative guidance that all team members can view."
        staffId={staffId}
        moduleId={moduleId}
        teamId={teamId}
        initialMarking={teamMarking}
        readOnly={markingReadOnly}
      />
    </div>
  );
}
