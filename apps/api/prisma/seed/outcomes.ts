import { prisma } from "./prismaClient";
import type { SeedProject, SeedTeam, SeedTemplate } from "./types";

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

  const teamMemberIds = teamMembers.map((tm) => tm.user.id);
  for (let i = 0; i < teamMemberIds.length; i++) {
    const reviewerId = teamMemberIds[i];
    const revieweeId = teamMemberIds[(i + 1) % teamMemberIds.length];
    if (!reviewerId || !revieweeId) continue;

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
        answersJson: {
          "Technical Skills": `${reviewerId % 2 === 0 ? "Excellent" : "Good"} technical abilities`,
          Communication: `${reviewerId % 3 === 0 ? "Clear" : "Could improve"} communication`,
          Teamwork: `${reviewerId % 4 === 0 ? "Strong" : "Adequate"} teamwork skills`,
        },
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
