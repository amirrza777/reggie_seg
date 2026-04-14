import { QuestionnairePurpose } from "@prisma/client";
import { prisma } from "../prismaClient";
import { seedAssessmentStudentEmail } from "../data";
import { uniquePositiveIds } from "../scenarioUtils";
import type { SeedContext } from "../types";

export async function resolveScenarioSeedTarget(context: SeedContext) {
  const module = context.modules[0];
  const template = context.templates[0];
  if (!module || !template) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (missing module/template)" } };
  }

  const assessmentStudentId = (context.users ?? []).find(
    (user) => user.role === "STUDENT" && user.email.toLowerCase() === seedAssessmentStudentEmail,
  )?.id;
  const scenarioStudents = context.usersByRole.students.slice(-4).map((user) => user.id);
  const memberIds = uniquePositiveIds([assessmentStudentId, ...scenarioStudents]);
  if (memberIds.length < 2) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (not enough team members)" } };
  }

  await prisma.questionnaireTemplate.update({
    where: { id: template.id },
    data: { purpose: QuestionnairePurpose.PEER_ASSESSMENT },
  });

  return { ready: true as const, module, template, memberIds };
}
