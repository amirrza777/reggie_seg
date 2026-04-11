import {
  clearStaffStudentDeadlineOverride as clearStaffStudentDeadlineOverrideInDb,
  getStaffStudentDeadlineOverrides,
  getUserProjectDeadline,
  updateStaffTeamDeadlineProfile as updateStaffTeamDeadlineProfileInDb,
  upsertStaffStudentDeadlineOverride as upsertStaffStudentDeadlineOverrideInDb,
  type StudentDeadlineOverrideInput,
} from "../repo.js";
import { addNotification } from "../../notifications/service.js";

/** Returns the project deadline. */
export async function fetchProjectDeadline(userId: number, projectId: number) {
  return getUserProjectDeadline(userId, projectId);
}

export async function updateTeamDeadlineProfileForStaff(
  actorUserId: number,
  teamId: number,
  deadlineProfile: "STANDARD" | "MCF",
) {
  return updateStaffTeamDeadlineProfileInDb(actorUserId, teamId, deadlineProfile);
}

export async function fetchStaffStudentDeadlineOverrides(actorUserId: number, projectId: number) {
  return getStaffStudentDeadlineOverrides(actorUserId, projectId);
}

export async function upsertStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
  payload: StudentDeadlineOverrideInput,
) {
  const override = await upsertStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId, payload);
  await addNotification({
    userId: studentId,
    type: "DEADLINE_OVERRIDE_GRANTED",
    message: "Your deadline has been updated by a staff member",
    link: `/projects/${projectId}/deadlines`,
  });
  return override;
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  return clearStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId);
}
