import { sendEmail } from "../../shared/email.js";

const defaultFrontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

export function buildProjectTeamWorkspaceUrl(projectId: number, baseUrl = defaultFrontendBaseUrl) {
  return `${baseUrl.replace(/\/$/, "")}/projects/${projectId}/team`;
}

export function mapAllocationDraftTeamForResponse(team: {
  id: number;
  teamName: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  draftCreatedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}) {
  return {
    id: team.id,
    teamName: team.teamName,
    memberCount: team.memberCount,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    draftCreatedBy: team.draftCreatedBy,
    members: team.members,
  };
}

export async function notifyStudentsAboutManualAllocation(
  projectId: number,
  projectName: string,
  teamName: string,
  students: Array<{ firstName: string; email: string }>,
) {
  const workspaceUrl = buildProjectTeamWorkspaceUrl(projectId);
  const results = await Promise.allSettled(
    students.map((student) => {
      const firstName = student.firstName?.trim() || "there";
      const subject = `Team allocation updated - ${projectName}`;
      const text = [
        `Hi ${firstName},`,
        "",
        `Your team allocation for ${projectName} has been updated.`,
        `Assigned team: ${teamName}`,
        "",
        `Open your team workspace: ${workspaceUrl}`,
        "",
        "You are receiving this because your account is enrolled on this project.",
        "If this appears incorrect, please contact your module staff in Team Feedback.",
      ].join("\n");

      return sendEmail({
        to: student.email,
        subject,
        text,
      });
    }),
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error(`Manual allocation email notifications failed for ${failures.length} student(s).`);
  }
}

export async function notifyStudentsAboutApprovedDraftTeam(
  projectId: number,
  projectName: string,
  teamName: string,
  students: Array<{ firstName: string; email: string }>,
) {
  await notifyStudentsAboutManualAllocation(projectId, projectName, teamName, students);
}

export function parseExpectedUpdatedAt(raw: unknown): Date | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") throw { code: "INVALID_EXPECTED_UPDATED_AT" };
  const trimmed = raw.trim();
  if (!trimmed) throw { code: "INVALID_EXPECTED_UPDATED_AT" };
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw { code: "INVALID_EXPECTED_UPDATED_AT" };
  return parsed;
}
