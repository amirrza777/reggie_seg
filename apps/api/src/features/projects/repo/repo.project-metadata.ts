import { prisma } from "../../../shared/db.js";

export async function getProjectById(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      informationText: true,
      archivedAt: true,
      moduleId: true,
      questionnaireTemplateId: true,
      teamAllocationQuestionnaireTemplateId: true,
      projectNavFlags: true,
      module: { select: { name: true, archivedAt: true } },
    },
  });
}
