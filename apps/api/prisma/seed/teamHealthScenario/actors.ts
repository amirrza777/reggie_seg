import { Role } from "@prisma/client";
import { seedAssessmentStudentEmail } from "../data";
import { prisma } from "../prismaClient";
import { uniquePositiveIds } from "../scenarioUtils";
import type { SeedContext } from "../types";
import { DEV_ADMIN_EMAIL } from "./constants";

export async function resolveScenarioActors(context: SeedContext) {
  const devAdmin = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: context.enterprise.id,
        email: DEV_ADMIN_EMAIL,
      },
    },
    select: { id: true },
  });

  const enterpriseAdmins = await prisma.user.findMany({
    where: { enterpriseId: context.enterprise.id, role: { in: [Role.ADMIN, Role.ENTERPRISE_ADMIN] } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const assessmentStudentId = (context.users ?? []).find(
    (user) => user.role === "STUDENT" && user.email.toLowerCase() === seedAssessmentStudentEmail,
  )?.id;
  const scenarioStudents = context.usersByRole.students.slice(-4);
  const fallbackRequester = assessmentStudentId ?? scenarioStudents[0]?.id ?? context.usersByRole.students[0]?.id ?? null;
  const fallbackReviewer = context.usersByRole.adminOrStaff[0]?.id ?? null;
  return {
    enterpriseAdmins,
    requesterId: fallbackRequester ?? devAdmin?.id ?? enterpriseAdmins[0]?.id ?? null,
    reviewerId: devAdmin?.id ?? enterpriseAdmins[0]?.id ?? fallbackReviewer ?? null,
  };
}

export function buildScenarioMemberIds(context: SeedContext, requesterId: number, _reviewerId: number | null) {
  void _reviewerId;
  const assessmentStudentId = (context.users ?? []).find(
    (user) => user.role === "STUDENT" && user.email.toLowerCase() === seedAssessmentStudentEmail,
  )?.id;
  const scenarioStudents = context.usersByRole.students.slice(-4);
  return uniquePositiveIds([
    assessmentStudentId,
    ...scenarioStudents.map((user) => user.id),
    requesterId,
  ]);
}

export function validateScenarioPrerequisites(moduleId: number | null, templateId: number | null, requesterId: number | null, memberIds: number[]) {
  if (!moduleId || !templateId) return { ok: false as const, details: "skipped (missing module/template)" };
  if (!requesterId) return { ok: false as const, details: "skipped (missing requester user)" };
  if (memberIds.length < 2) return { ok: false as const, details: "skipped (not enough team members)" };
  return { ok: true as const };
}
