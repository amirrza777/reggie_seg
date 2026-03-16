import { dismissTeamFlag, findTeamById, findUserRoleById } from "./repo.js";

export async function isStaffOrAdmin(userId: number | undefined) {
  if (!userId) return false;
  const user = await findUserRoleById(userId);
  const role = user?.role;
  return role === "STAFF" || role === "ENTERPRISE_ADMIN" || role === "ADMIN";
}

export async function dismissInactivityFlag(teamId: number) {
  const team = await findTeamById(teamId);
  if (!team) return { ok: false as const, status: 404, error: "Team not found" };
  await dismissTeamFlag(teamId);
  return { ok: true as const, value: { success: true } };
}
