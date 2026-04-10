import { prisma } from "../prismaClient";
import { uniquePositiveIds } from "../scenarioUtils";
import type { SeedContext } from "../types";
import { PEER_SCENARIO_DEV_ADMIN_EMAIL } from "./constants";

export async function resolveScenarioSeedTarget(context: SeedContext) {
  const module = context.modules[0];
  const template = context.templates[0];
  if (!module || !template) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (missing module/template)" } };
  }

  const devAdmin = await prisma.user.findUnique({
    where: {
      enterpriseId_email: {
        enterpriseId: context.enterprise.id,
        email: PEER_SCENARIO_DEV_ADMIN_EMAIL,
      },
    },
    select: { id: true },
  });

  const scenarioStudents = context.usersByRole.students.slice(-4).map((user) => user.id);
  const memberIds = uniquePositiveIds([...(devAdmin ? [devAdmin.id] : []), ...scenarioStudents]);
  if (memberIds.length < 2) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (not enough team members)" } };
  }

  return { ready: true as const, module, template, memberIds };
}
