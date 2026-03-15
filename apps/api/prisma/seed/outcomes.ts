import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedProject, SeedTeam, SeedTemplate } from "./types";
import { SEED_FEATURE_FLAG_COUNT, SEED_PEER_REVIEWS_PER_MEMBER } from "./volumes";

function getNumberConfig(configs: unknown, key: "min" | "max" | "step", fallback: number): number {
  if (!configs || typeof configs !== "object" || Array.isArray(configs)) return fallback;
  const value = (configs as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getMultipleChoiceOptions(configs: unknown): string[] {
  if (!configs || typeof configs !== "object" || Array.isArray(configs)) return [];
  const options = (configs as Record<string, unknown>).options;
  if (!Array.isArray(options)) return [];
  return options.filter((option): option is string => typeof option === "string" && option.trim().length > 0);
}

function getTextSeedAnswer(label: string, reviewerId: number): string {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes("technical")) {
    return reviewerId % 2 === 0
      ? "Strong technical implementation and problem-solving."
      : "Good technical foundation with room for deeper testing.";
  }
  if (normalizedLabel.includes("communication")) {
    return reviewerId % 2 === 0
      ? "Clear communication and regular updates to the team."
      : "Communication was generally good but could be more proactive.";
  }
  if (normalizedLabel.includes("teamwork")) {
    return reviewerId % 2 === 0
      ? "Collaborated well and supported teammates consistently."
      : "Worked well with the team and contributed reliably.";
  }
  return "Constructive feedback provided in this response.";
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
      if (!project) continue;
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

          const existingAssessment = await prisma.peerAssessment.findUnique({
            where: {
              projectId_teamId_reviewerUserId_revieweeUserId: {
                projectId: team.projectId,
                teamId: team.id,
                reviewerUserId: reviewerId,
                revieweeUserId: revieweeId,
              },
            },
            select: { id: true },
          });

          const assessment = await prisma.peerAssessment.upsert({
            where: {
              projectId_teamId_reviewerUserId_revieweeUserId: {
                projectId: team.projectId,
                teamId: team.id,
                reviewerUserId: reviewerId,
                revieweeUserId: revieweeId,
              },
            },
            update: {
              templateId: template.id,
              answersJson,
            },
            create: {
              projectId: team.projectId,
              teamId: team.id,
              reviewerUserId: reviewerId,
              revieweeUserId: revieweeId,
              templateId: template.id,
              answersJson,
            },
          });

          if (!existingAssessment) createdAssessments += 1;

          const existingFeedback = await prisma.peerFeedback.findUnique({
            where: { peerAssessmentId: assessment.id },
            select: { id: true },
          });

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

          if (!existingFeedback) createdFeedbacks += 1;
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
