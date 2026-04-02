import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext, SeedProject, SeedTeam, SeedTemplate } from "./types";
import {
  buildAssessmentLookup,
  buildStaffPoolByModuleId,
  buildStaffStudentMarkRows,
  findExistingFeatureFlagKeys,
  getDefaultFeatureFlags,
  getProjectsWithExistingDeadlines,
  getSafeStudentAllocationCandidates,
  getStaffStudentMarksReadiness,
  scopeStudentMarkCandidates,
  seedPeerAssessmentsForTeam,
  upsertFeatureFlags,
  upsertProjectDeadlines,
} from "./outcomes/helpers";

export async function seedProjectDeadlines(projects: SeedProject[]) {
  return withSeedLogging("seedProjectDeadlines", async () => {
    if (projects.length === 0) return { value: undefined, rows: 0, details: "skipped (no projects)" };

    const existingProjectIds = await getProjectsWithExistingDeadlines(projects);
    const createdCount = await upsertProjectDeadlines(projects, existingProjectIds);
    return { value: undefined, rows: createdCount, details: `processed projects=${projects.length}` };
  });
}

export async function seedPeerAssessments(projects: SeedProject[], teams: SeedTeam[], templates: SeedTemplate[]) {
  return withSeedLogging("seedPeerAssessments", async () => {
    if (projects.length === 0 || templates.length === 0) return { value: undefined, rows: 0, details: "skipped (no projects/templates)" };

    const lookup = buildAssessmentLookup(projects, templates);
    const totals = { createdAssessments: 0, createdFeedbacks: 0 };
    for (const team of teams) {
      const seeded = await seedPeerAssessmentsForTeam(team, lookup.projectTemplateMap, lookup.templateMap);
      totals.createdAssessments += seeded.createdAssessments;
      totals.createdFeedbacks += seeded.createdFeedbacks;
    }

    return {
      value: undefined,
      rows: totals.createdAssessments + totals.createdFeedbacks,
      details: `peerAssessments=${totals.createdAssessments}, peerFeedbacks=${totals.createdFeedbacks}`,
    };
  });
}

export async function seedFeatureFlags(enterpriseId: string) {
  return withSeedLogging("seedFeatureFlags", async () => {
    const defaults = getDefaultFeatureFlags();
    const existingKeys = await findExistingFeatureFlagKeys(enterpriseId, defaults.map((flag) => flag.key));
    await upsertFeatureFlags(enterpriseId, defaults);
    const createdCount = defaults.filter((flag) => !existingKeys.has(flag.key)).length;
    return { value: undefined, rows: createdCount, details: `processed flags=${defaults.length}` };
  });
}

export async function seedStaffStudentMarks(context: SeedContext) {
  return withSeedLogging("seedStaffStudentMarks", async () => {
    const readiness = await getStaffStudentMarksReadiness(context);
    if (!readiness.ready) return readiness.result;

    const candidates = await getSafeStudentAllocationCandidates(readiness.teamAllocations);
    if (candidates.length === 0) return { value: undefined, rows: 0, details: "skipped (no student allocations eligible for marks)" };

    const scopedCandidates = scopeStudentMarkCandidates(candidates);
    if (scopedCandidates.length === 0) return { value: undefined, rows: 0, details: "skipped (student mark coverage set to 0)" };

    const staffPoolByModuleId = buildStaffPoolByModuleId(readiness.moduleLeads, readiness.moduleTeachingAssistants);
    const rows = buildStaffStudentMarkRows(scopedCandidates, staffPoolByModuleId, readiness.fallbackMarker.id, context);
    const result = await prisma.staffStudentMarking.createMany({ data: rows, skipDuplicates: true });
    const studentRecipients = new Set(candidates.map((candidate) => candidate.userId)).size;

    return { value: undefined, rows: result.count, details: `planned=${rows.length}, studentRecipients=${studentRecipients}` };
  });
}
