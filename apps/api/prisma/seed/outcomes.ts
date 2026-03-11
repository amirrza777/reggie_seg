import { prisma } from "./prismaClient";
import type { SeedProject, SeedTeam, SeedTemplate } from "./types";

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

export async function seedProjectDeadlines() {
  const now = new Date();
  const taskOpen = new Date(now);
  const taskDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 1 * 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 3 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 1 * 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 3 * 24 * 60 * 60 * 1000);

  await prisma.projectDeadline.upsert({
    where: { projectId: 1 },
    update: {},
    create: {
      projectId: 1,
      taskOpenDate: taskOpen,
      taskDueDate: taskDue,
      assessmentOpenDate: assessmentOpen,
      assessmentDueDate: assessmentDue,
      feedbackOpenDate: feedbackOpen,
      feedbackDueDate: feedbackDue,
    },
  });
}

export async function seedPeerAssessments(projects: SeedProject[], teams: SeedTeam[], templates: SeedTemplate[]) {
  if (projects.length === 0 || templates.length === 0) return;

  const project1 = projects[0];
  const team1 = teams.find((t) => t.projectId === project1?.id);
  const template1 = templates[0];
  if (!project1 || !team1 || !template1) return;

  const teamMembers = await prisma.teamAllocation.findMany({
    where: { teamId: team1.id },
    include: { user: true },
  });
  if (teamMembers.length < 2) return;

  const templateQuestions = await prisma.question.findMany({
    where: { templateId: template1.id },
    orderBy: { order: "asc" },
    select: { id: true, label: true, type: true, configs: true },
  });
  if (templateQuestions.length === 0) return;

  const teamMemberIds = teamMembers.map((tm) => tm.user.id);
  for (let i = 0; i < teamMemberIds.length; i++) {
    const reviewerId = teamMemberIds[i];
    const revieweeId = teamMemberIds[(i + 1) % teamMemberIds.length];
    if (!reviewerId || !revieweeId) continue;
    const mappedAnswers = templateQuestions.map((question, questionIndex) => {
      if (question.type === "text") {
        return {
          question: String(question.id),
          answer: getTextSeedAnswer(question.label, reviewerId),
        };
      }

      if (question.type === "rating") {
        const min = getNumberConfig(question.configs, "min", 1);
        const max = getNumberConfig(question.configs, "max", Math.max(min, 5));
        const range = Math.max(0, max - min);
        return {
          question: String(question.id),
          answer: min + ((reviewerId + questionIndex) % (range + 1)),
        };
      }

      if (question.type === "slider") {
        const min = getNumberConfig(question.configs, "min", 0);
        const max = getNumberConfig(question.configs, "max", Math.max(min, 100));
        const step = Math.max(1, getNumberConfig(question.configs, "step", 1));
        const stepCount = Math.max(0, Math.floor((max - min) / step));
        return {
          question: String(question.id),
          answer: min + (((reviewerId + questionIndex) % (stepCount + 1)) * step),
        };
      }

      if (question.type === "multiple-choice") {
        const options = getMultipleChoiceOptions(question.configs);
        if (options.length === 0) return null;
        return {
          question: String(question.id),
          answer: options[(reviewerId + questionIndex) % options.length],
        };
      }

      return {
        question: String(question.id),
        answer: getTextSeedAnswer(question.label, reviewerId),
      };
    });
    if (mappedAnswers.some((item) => item == null)) continue;
    const answersJson = mappedAnswers.filter(
      (item): item is { question: string; answer: string | number } => item != null
    );

    await prisma.peerAssessment.upsert({
      where: {
        projectId_teamId_reviewerUserId_revieweeUserId: {
          projectId: project1.id,
          teamId: team1.id,
          reviewerUserId: reviewerId,
          revieweeUserId: revieweeId,
        },
      },
      update: {},
      create: {
        projectId: project1.id,
        teamId: team1.id,
        reviewerUserId: reviewerId,
        revieweeUserId: revieweeId,
        templateId: template1.id,
        answersJson,
      },
    });
  }
}

export async function seedFeatureFlags(enterpriseId: string) {
  const defaults = [
    { key: "peer_feedback", label: "Peer feedback", enabled: true },
    { key: "modules", label: "Modules", enabled: true },
    { key: "repos", label: "Repositories", enabled: true },
  ];

  for (const flag of defaults) {
    await prisma.featureFlag.upsert({
      where: { enterpriseId_key: { enterpriseId, key: flag.key } },
      update: { label: flag.label, enabled: flag.enabled },
      create: { ...flag, enterpriseId },
    });
  }
}
