import { randSentence } from "@ngneat/falso";
import { Role } from "@prisma/client";
import { SEED_STUDENT_MARK_COVERAGE, SEED_STUDENT_MARK_MAX, SEED_STUDENT_MARK_MIN } from "./config";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext, SeedProject, SeedTeam, SeedTemplate } from "./types";
import { SEED_FEATURE_FLAG_COUNT, SEED_PEER_REVIEWS_PER_MEMBER } from "./volumes";

function normalizeSentence(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") {
    return "Steady contribution and reliable collaboration across project work.";
  }
  const sentence = raw.replace(/\s+/g, " ").trim();
  return sentence.length > 0 ? sentence : "Steady contribution and reliable collaboration across project work.";
}

export async function seedProjectDeadlines(projects: SeedProject[]) {
  return withSeedLogging("seedProjectDeadlines", async () => {
    if (projects.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no projects)" };
    }

    const projectIds = projects.map((project) => project.id);
    const existingBefore = await prisma.projectDeadline.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    });
    const existingProjectIds = new Set(existingBefore.map((deadline) => deadline.projectId));

    let createdCount = 0;
    const now = new Date();
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      if (!existingProjectIds.has(project.id)) createdCount += 1;

      const taskOpen = new Date(now.getTime() + index * 24 * 60 * 60 * 1000);
      const taskDue = new Date(taskOpen.getTime() + 7 * 24 * 60 * 60 * 1000);
      const assessmentOpen = new Date(taskDue.getTime() + 1 * 24 * 60 * 60 * 1000);
      const assessmentDue = new Date(assessmentOpen.getTime() + 3 * 24 * 60 * 60 * 1000);
      const feedbackOpen = new Date(assessmentDue.getTime() + 1 * 24 * 60 * 60 * 1000);
      const feedbackDue = new Date(feedbackOpen.getTime() + 3 * 24 * 60 * 60 * 1000);

      await prisma.projectDeadline.upsert({
        where: { projectId: project.id },
        update: {
          taskOpenDate: taskOpen,
          taskDueDate: taskDue,
          assessmentOpenDate: assessmentOpen,
          assessmentDueDate: assessmentDue,
          feedbackOpenDate: feedbackOpen,
          feedbackDueDate: feedbackDue,
        },
        create: {
          projectId: project.id,
          taskOpenDate: taskOpen,
          taskDueDate: taskDue,
          assessmentOpenDate: assessmentOpen,
          assessmentDueDate: assessmentDue,
          feedbackOpenDate: feedbackOpen,
          feedbackDueDate: feedbackDue,
        },
      });
    }

    return {
      value: undefined,
      rows: createdCount,
      details: `processed projects=${projects.length}`,
    };
  });
}

export async function seedPeerAssessments(projects: SeedProject[], teams: SeedTeam[], templates: SeedTemplate[]) {
  return withSeedLogging("seedPeerAssessments", async () => {
    if (projects.length === 0 || templates.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no projects/templates)" };
    }

    const projectTemplateMap = new Map(projects.map((project) => [project.id, project.templateId]));
    const templateMap = new Map(templates.map((template) => [template.id, template]));

    let createdAssessments = 0;
    let createdFeedbacks = 0;
    for (const team of teams) {
      const templateId = projectTemplateMap.get(team.projectId);
      const template = templateId ? templateMap.get(templateId) : null;
      if (!template) continue;

      const teamMembers = await prisma.teamAllocation.findMany({
        where: { teamId: team.id },
        include: { user: true },
        orderBy: { userId: "asc" },
      });
      if (teamMembers.length < 2) continue;

      const teamMemberIds = teamMembers.map((member) => member.user.id);
      const reviewSpan = Math.min(SEED_PEER_REVIEWS_PER_MEMBER, teamMemberIds.length - 1);
      const existingAssessments = await prisma.peerAssessment.findMany({
        where: {
          projectId: team.projectId,
          teamId: team.id,
        },
        select: {
          id: true,
          reviewerUserId: true,
          revieweeUserId: true,
        },
      });
      const assessmentIdByPair = new Map(
        existingAssessments.map((assessment) => [buildReviewPairKey(assessment.reviewerUserId, assessment.revieweeUserId), assessment.id])
      );
      const existingFeedbackIds = new Set(
        (
          await prisma.peerFeedback.findMany({
            where: { peerAssessmentId: { in: existingAssessments.map((assessment) => assessment.id) } },
            select: { peerAssessmentId: true },
          })
        ).map((feedback) => feedback.peerAssessmentId)
      );

      for (let reviewerIndex = 0; reviewerIndex < teamMemberIds.length; reviewerIndex += 1) {
        const reviewerId = teamMemberIds[reviewerIndex];
        if (!reviewerId) continue;

        for (let offset = 1; offset <= reviewSpan; offset += 1) {
          const revieweeId = teamMemberIds[(reviewerIndex + offset) % teamMemberIds.length];
          if (!revieweeId) continue;

          const answersJson = Object.fromEntries(
            template.questionLabels.map((label, questionIndex) => [
              label,
              buildAssessmentAnswer(reviewerId, revieweeId, questionIndex),
            ])
          );
          const reviewPairKey = buildReviewPairKey(reviewerId, revieweeId);
          const existingAssessmentId = assessmentIdByPair.get(reviewPairKey);
          const assessment = existingAssessmentId
            ? await prisma.peerAssessment.update({
                where: { id: existingAssessmentId },
                data: {
                  templateId: template.id,
                  answersJson,
                },
              })
            : await prisma.peerAssessment.create({
                data: {
                  projectId: team.projectId,
                  teamId: team.id,
                  reviewerUserId: reviewerId,
                  revieweeUserId: revieweeId,
                  templateId: template.id,
                  answersJson,
                },
              });

          if (!existingAssessmentId) {
            assessmentIdByPair.set(reviewPairKey, assessment.id);
            createdAssessments += 1;
          }

          await prisma.peerFeedback.upsert({
            where: { peerAssessmentId: assessment.id },
            update: {
              reviewText: buildFeedbackText(reviewerId, revieweeId),
              agreementsJson: buildAgreementPayload(reviewerId, revieweeId),
            },
            create: {
              teamId: team.id,
              peerAssessmentId: assessment.id,
              reviewerUserId: reviewerId,
              revieweeUserId: revieweeId,
              reviewText: buildFeedbackText(reviewerId, revieweeId),
              agreementsJson: buildAgreementPayload(reviewerId, revieweeId),
            },
          });

          if (!existingFeedbackIds.has(assessment.id)) {
            existingFeedbackIds.add(assessment.id);
            createdFeedbacks += 1;
          }
        }
      }
    }

    return {
      value: undefined,
      rows: createdAssessments + createdFeedbacks,
      details: `peerAssessments=${createdAssessments}, peerFeedbacks=${createdFeedbacks}`,
    };
  });
}

function buildReviewPairKey(reviewerId: number, revieweeId: number) {
  return `${reviewerId}:${revieweeId}`;
}

export async function seedFeatureFlags(enterpriseId: string) {
  return withSeedLogging("seedFeatureFlags", async () => {
    const defaults = [
      { key: "peer_feedback", label: "Peer feedback", enabled: true },
      { key: "modules", label: "Modules", enabled: true },
      { key: "repos", label: "Repositories", enabled: true },
      { key: "dashboards", label: "Dashboards", enabled: true },
      { key: "meetings", label: "Meetings", enabled: true },
      { key: "questionnaires", label: "Questionnaires", enabled: true },
      { key: "github_sync", label: "Github Sync", enabled: true },
      { key: "team_overrides", label: "Team Overrides", enabled: true },
    ].slice(0, SEED_FEATURE_FLAG_COUNT);

    const existing = await prisma.featureFlag.findMany({
      where: {
        enterpriseId,
        key: { in: defaults.map((flag) => flag.key) },
      },
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((flag) => flag.key));

    for (const flag of defaults) {
      await prisma.featureFlag.upsert({
        where: { enterpriseId_key: { enterpriseId, key: flag.key } },
        update: { label: flag.label, enabled: flag.enabled },
        create: { ...flag, enterpriseId },
      });
    }

    const createdCount = defaults.filter((flag) => !existingKeys.has(flag.key)).length;
    return {
      value: undefined,
      rows: createdCount,
      details: `processed flags=${defaults.length}`,
    };
  });
}

function buildSeedStudentMark(minMark: number, maxMark: number, index: number, studentUserId: number) {
  const low = Math.min(minMark, maxMark);
  const high = Math.max(minMark, maxMark);
  const span = Math.max(1, high - low + 1);
  return low + ((index + studentUserId) % span);
}

export async function seedStaffStudentMarks(context: SeedContext) {
  return withSeedLogging("seedStaffStudentMarks", async () => {
    const teamIds = context.teams.map((team) => team.id);
    if (teamIds.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no teams)" };
    }

    const fallbackMarker = context.usersByRole.adminOrStaff[0];
    if (!fallbackMarker) {
      return { value: undefined, rows: 0, details: "skipped (no staff/admin marker available)" };
    }

    const projectModuleMap = new Map(context.projects.map((project) => [project.id, project.moduleId]));
    const teamProjectMap = new Map(context.teams.map((team) => [team.id, team.projectId]));

    const [teamAllocations, moduleLeads, moduleTeachingAssistants] = await Promise.all([
      prisma.teamAllocation.findMany({
        where: { teamId: { in: teamIds } },
        select: {
          teamId: true,
          userId: true,
          user: { select: { role: true } },
        },
      }),
      prisma.moduleLead.findMany({
        where: { moduleId: { in: context.modules.map((module) => module.id) } },
        select: { moduleId: true, userId: true },
      }),
      prisma.moduleTeachingAssistant.findMany({
        where: { moduleId: { in: context.modules.map((module) => module.id) } },
        select: { moduleId: true, userId: true },
      }),
    ]);

    const studentCandidates = teamAllocations.filter((allocation) => allocation.user.role === Role.STUDENT);
    const uniqueCandidateIds = Array.from(new Set(studentCandidates.map((allocation) => allocation.userId)));
    const confirmedStudents = await prisma.user.findMany({
      where: {
        id: { in: uniqueCandidateIds },
        role: Role.STUDENT,
      },
      select: { id: true },
    });
    const confirmedStudentIds = new Set(confirmedStudents.map((user) => user.id));
    const safeCandidates = studentCandidates.filter((allocation) => confirmedStudentIds.has(allocation.userId));

    if (safeCandidates.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no student allocations eligible for marks)" };
    }

    const coverageCount = Math.floor(safeCandidates.length * SEED_STUDENT_MARK_COVERAGE);
    const targetCount =
      SEED_STUDENT_MARK_COVERAGE > 0 ? Math.max(1, coverageCount) : 0;
    if (targetCount === 0) {
      return { value: undefined, rows: 0, details: "skipped (student mark coverage set to 0)" };
    }
    const scopedCandidates = safeCandidates.slice(0, targetCount);

    const staffPoolByModuleId = new Map<number, number[]>();
    for (const assignment of moduleLeads) {
      const pool = staffPoolByModuleId.get(assignment.moduleId) ?? [];
      if (!pool.includes(assignment.userId)) pool.push(assignment.userId);
      staffPoolByModuleId.set(assignment.moduleId, pool);
    }
    for (const assignment of moduleTeachingAssistants) {
      const pool = staffPoolByModuleId.get(assignment.moduleId) ?? [];
      if (!pool.includes(assignment.userId)) pool.push(assignment.userId);
      staffPoolByModuleId.set(assignment.moduleId, pool);
    }

    const rows = scopedCandidates.map((candidate, index) => {
      const projectId = teamProjectMap.get(candidate.teamId);
      const moduleId = projectId ? projectModuleMap.get(projectId) : undefined;
      const modulePool = moduleId ? staffPoolByModuleId.get(moduleId) : undefined;
      const markerUserId = modulePool?.length
        ? modulePool[(index + candidate.userId) % modulePool.length]
        : fallbackMarker.id;
      return {
        teamId: candidate.teamId,
        studentUserId: candidate.userId,
        markerUserId,
        mark: buildSeedStudentMark(SEED_STUDENT_MARK_MIN, SEED_STUDENT_MARK_MAX, index, candidate.userId),
        formativeFeedback: normalizeSentence(randSentence({ length: { min: 7, max: 12 } })),
      };
    });

    const result = await prisma.staffStudentMarking.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return {
      value: undefined,
      rows: result.count,
      details: `planned=${rows.length}, studentRecipients=${confirmedStudentIds.size}`,
    };
  });
}

function buildAssessmentAnswer(reviewerId: number, revieweeId: number, questionIndex: number) {
  const score = (reviewerId + revieweeId + questionIndex) % 5;
  const tones = ["Needs support", "Developing", "Solid", "Strong", "Outstanding"];
  return `${tones[score]} contribution observed during sprint work and collaboration.`;
}

function buildFeedbackText(reviewerId: number, revieweeId: number) {
  return `Reviewer ${reviewerId} noted that teammate ${revieweeId} contributed consistently, communicated blockers early, and supported delivery across shared tasks.`;
}

function buildAgreementPayload(reviewerId: number, revieweeId: number) {
  return {
    communication: (reviewerId + revieweeId) % 2 === 0,
    contributionVisible: true,
    wouldWorkAgain: (reviewerId + revieweeId) % 3 !== 0,
    followUpNeeded: (reviewerId + revieweeId) % 5 === 0,
  };
}
