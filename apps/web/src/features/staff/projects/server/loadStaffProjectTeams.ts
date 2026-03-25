import "server-only";
import { getStaffProjectTeams } from "./getStaffProjectTeamsCached";

type StaffProjectTeamsData = Awaited<ReturnType<typeof getStaffProjectTeams>>;

export type StaffProjectTeamsLoadResult =
  | {
      status: "invalid_project_id";
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "ok";
      numericProjectId: number;
      data: StaffProjectTeamsData;
    };

export async function loadStaffProjectTeamsForPage(
  userId: number,
  projectIdParam: string,
  fallbackErrorMessage: string
): Promise<StaffProjectTeamsLoadResult> {
  const numericProjectId = Number(projectIdParam);
  if (Number.isNaN(numericProjectId)) {
    return { status: "invalid_project_id" };
  }

  try {
    const data = await getStaffProjectTeams(userId, numericProjectId);
    return {
      status: "ok",
      numericProjectId,
      data,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0 ? error.message : fallbackErrorMessage;
    return {
      status: "error",
      message,
    };
  }
}
