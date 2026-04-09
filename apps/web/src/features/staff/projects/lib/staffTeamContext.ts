import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { staffProjectWorkspaceAggregates } from "./staffProjectWorkspaceAggregates";

export type StaffTeamContextSuccess = {
  ok: true;
  user: { id: number };
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
    moduleArchivedAt?: string | null;
    projectArchivedAt?: string | null;
    viewerAccessLabel?: string;
    teamCount: number;
    studentCount: number;
  };
  team: Awaited<ReturnType<typeof getStaffProjectTeams>>["teams"][number];
};

export type StaffTeamContextError = {
  ok: false;
  error: string;
};

export type StaffTeamContextResult = StaffTeamContextSuccess | StaffTeamContextError;

/**
 * Single source for staff team route auth and project/team data
 */
export const getStaffTeamContext = cache(
  async (projectId: string, teamId: string): Promise<StaffTeamContextResult> => {
    const user = await getCurrentUser();
    if (!user?.isStaff && user?.role !== "ADMIN") {
      redirect("/dashboard");
    }

    const numericProjectId = Number(projectId);
    const numericTeamId = Number(teamId);
    if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
      return { ok: false, error: "Invalid project or team ID." };
    }

    let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
    let errorMessage: string | null = null;
    try {
      data = await getStaffProjectTeams(user.id, numericProjectId);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load project team data.";
    }

    const team = data?.teams.find((t) => t.id === numericTeamId) ?? null;
    if (!data || !team) {
      return { ok: false, error: errorMessage ?? "Team not found in this project." };
    }

    const { teamCount, studentCount, accessRoleLabel } = staffProjectWorkspaceAggregates(data);
    return {
      ok: true,
      user: { id: user.id },
      project: {
        ...data.project,
        viewerAccessLabel: data.project.viewerAccessLabel ?? accessRoleLabel,
        teamCount,
        studentCount,
      },
      team,
    };
  }
);
