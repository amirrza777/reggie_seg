import type { StaffProjectTeamsResponse } from "@/features/projects/types";

export function staffProjectWorkspaceAggregates(data: StaffProjectTeamsResponse): {
  teamCount: number;
  studentCount: number;
  accessRoleLabel: string;
} {
  const teams = data.teams ?? [];
  const teamCount = teams.length;
  const studentCount = teams.reduce(
    (sum, team) => sum + (team.allocations?.length ?? 0),
    0,
  );
  return {
    teamCount,
    studentCount,
    accessRoleLabel: data.project.viewerAccessLabel ?? "Staff access",
  };
}
