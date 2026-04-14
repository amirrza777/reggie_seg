import { prisma } from "../prismaClient";
import type { AssessmentStudentScenarioProject } from "./setup";

export async function seedAssessmentStudentMarks(
  projects: AssessmentStudentScenarioProject[],
  memberIds: number[],
  markerUserId: number,
) {
  let teamMarks = 0;
  let studentMarks = 0;
  for (const project of projects) {
    await clearProjectMarks(project.teamId);
    if (project.state !== "completed-marked") continue;
    await upsertTeamMark(project.teamId, markerUserId);
    teamMarks += 1;
    studentMarks += await upsertStudentMarks(project.teamId, memberIds, markerUserId);
  }
  return { teamMarks, studentMarks };
}

async function clearProjectMarks(teamId: number) {
  await prisma.staffStudentMarking.deleteMany({ where: { teamId } });
  await prisma.staffTeamMarking.deleteMany({ where: { teamId } });
}

function upsertTeamMark(teamId: number, markerUserId: number) {
  return prisma.staffTeamMarking.upsert({
    where: { teamId },
    update: { markerUserId, mark: 74, formativeFeedback: "Strong delivery with clear evidence of teamwork." },
    create: { teamId, markerUserId, mark: 74, formativeFeedback: "Strong delivery with clear evidence of teamwork." },
  });
}

async function upsertStudentMarks(teamId: number, memberIds: number[], markerUserId: number) {
  let rows = 0;
  for (let index = 0; index < memberIds.length; index += 1) {
    const studentUserId = memberIds[index];
    if (!studentUserId) continue;
    await prisma.staffStudentMarking.upsert({
      where: { teamId_studentUserId: { teamId, studentUserId } },
      update: buildStudentMarkWrite(markerUserId, index),
      create: { teamId, studentUserId, ...buildStudentMarkWrite(markerUserId, index) },
    });
    rows += 1;
  }
  return rows;
}

function buildStudentMarkWrite(markerUserId: number, index: number) {
  return {
    markerUserId,
    mark: 68 + (index % 5),
    formativeFeedback: "Reliable contribution, good collaboration, and clear engagement with assessment evidence.",
  };
}
