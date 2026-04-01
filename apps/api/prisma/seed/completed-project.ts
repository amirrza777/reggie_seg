import { Role } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCENARIO_PROJECT_NAME = "Completed Demo Project";
const SCENARIO_TEAM_NAME = "Completed Demo Team";

type ScenarioQuestion = {
  id: number;
  label: string;
  type: string;
  order: number;
  configs: unknown | null;
};

function buildReviewPairKey(reviewerId: number, revieweeId: number) {
  return `${reviewerId}:${revieweeId}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getNumberConfig(configs: unknown, key: "min" | "max" | "step", fallback: number): number {
  const row = asRecord(configs);
  if (!row) return fallback;
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getOptionsConfig(configs: unknown): string[] {
  const row = asRecord(configs);
  if (!row || !Array.isArray(row.options)) return [];
  return row.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0);
}

function getTextSeedAnswer(label: string, reviewerId: number): string {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes("technical")) {
    return reviewerId % 2 === 0
      ? "Strong technical implementation and dependable code quality."
      : "Good technical foundation and consistent contribution across tasks.";
  }
  if (normalizedLabel.includes("communication")) {
    return reviewerId % 2 === 0
      ? "Communicated blockers early and kept teammates aligned."
      : "Communication was clear with timely updates during each sprint.";
  }
  if (normalizedLabel.includes("teamwork")) {
    return reviewerId % 2 === 0
      ? "Collaborated well and supported teammates throughout delivery."
      : "Worked effectively with the team and helped unblock others.";
  }
  return "Consistently contributed and collaborated during the project lifecycle.";
}

function buildScenarioAnswer(question: ScenarioQuestion, reviewerId: number, revieweeId: number, index: number): unknown {
  const type = question.type.trim().toLowerCase();

  if (type === "slider" || type === "rating") {
    const min = getNumberConfig(question.configs, "min", 0);
    const max = getNumberConfig(question.configs, "max", 10);
    const step = Math.max(0.1, getNumberConfig(question.configs, "step", 1));
    const range = Math.max(step, max - min);
    const ratio = (((reviewerId + revieweeId + index) % 5) + 1) / 5;
    const raw = min + range * ratio;
    const snapped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, Number(snapped.toFixed(2))));
  }

  if (type === "multiple-choice" || type === "multiple_choice") {
    const options = getOptionsConfig(question.configs);
    if (options.length > 0) {
      return options[(reviewerId + revieweeId + index) % options.length];
    }
    const fallbackOptions = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
    return fallbackOptions[(reviewerId + revieweeId + index) % fallbackOptions.length];
  }

  return getTextSeedAnswer(question.label, reviewerId);
}

function buildFeedbackText(reviewerId: number, revieweeId: number) {
  return `Reviewer ${reviewerId} noted that teammate ${revieweeId} maintained steady contributions, met deadlines, and supported team delivery.`;
}

function buildAgreementPayload(reviewerId: number, revieweeId: number) {
  return {
    communication: (reviewerId + revieweeId) % 2 === 0,
    contributionVisible: true,
    wouldWorkAgain: (reviewerId + revieweeId) % 3 !== 0,
    followUpNeeded: false,
  };
}

async function ensureScenarioMeetings(teamId: number, organiserId: number, memberIds: number[]) {
  const dates = [28, 21, 14, 7].map((daysAgo) => new Date(Date.now() - daysAgo * DAY_MS));
  let createdMeetings = 0;
  let createdMinutes = 0;
  let createdAttendances = 0;

  for (let index = 0; index < dates.length; index += 1) {
    const date = dates[index];
    const title = `[SEED] Completed Check-in ${index + 1}`;

    const existingMeeting = await prisma.meeting.findFirst({
      where: { teamId, title },
      select: { id: true },
    });

    const meeting = existingMeeting
      ? await prisma.meeting.findUnique({
          where: { id: existingMeeting.id },
          select: { id: true },
        })
      : await prisma.meeting.create({
          data: {
            teamId,
            organiserId,
            title,
            subject: "Project completion sync",
            location: "Online",
            agenda: "Final checks, handover, and retrospective actions.",
            date,
          },
          select: { id: true },
        });

    if (!meeting) continue;
    if (!existingMeeting) createdMeetings += 1;

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { meetingId: meeting.id },
      select: { id: true },
    });
    if (!minutes) {
      await prisma.meetingMinutes.create({
        data: {
          meetingId: meeting.id,
          writerId: organiserId,
          content: "Team reviewed progress, closed open actions, and confirmed final delivery quality.",
        },
      });
      createdMinutes += 1;
    }

    for (let memberIndex = 0; memberIndex < memberIds.length; memberIndex += 1) {
      const memberId = memberIds[memberIndex];
      if (!memberId) continue;
      const existingAttendance = await prisma.meetingAttendance.findUnique({
        where: { meetingId_userId: { meetingId: meeting.id, userId: memberId } },
        select: { meetingId: true },
      });
      if (existingAttendance) continue;

      const status = memberIndex === memberIds.length - 1 && index % 2 === 0 ? "late" : "present";
      await prisma.meetingAttendance.create({
        data: {
          meetingId: meeting.id,
          userId: memberId,
          status,
        },
      });
      createdAttendances += 1;
    }
  }

  return { createdMeetings, createdMinutes, createdAttendances };
}

export async function seedCompletedProjectScenario(context: SeedContext) {
  return withSeedLogging("seedCompletedProjectScenario", async () => {
    const module = context.modules[0];
    const template = context.templates[0];
    const marker = context.usersByRole.adminOrStaff[0];
    if (!module || !template || !marker) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (missing module/template/marker)",
      };
    }

    const enterpriseAdmins = await prisma.user.findMany({
      where: {
        enterpriseId: context.enterprise.id,
        role: { in: [Role.ADMIN, Role.ENTERPRISE_ADMIN] },
      },
      select: { id: true },
    });

    const memberIds = Array.from(
      new Set([
        ...context.usersByRole.students.slice(0, 4).map((user) => user.id),
        ...enterpriseAdmins.map((user) => user.id),
      ])
    );

    if (memberIds.length < 2) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (not enough team members for scenario)",
      };
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        name: SCENARIO_PROJECT_NAME,
        module: { enterpriseId: context.enterprise.id },
      },
      select: { id: true, questionnaireTemplateId: true },
    });

    const project = existingProject
      ? existingProject
      : await prisma.project.create({
          data: {
            name: SCENARIO_PROJECT_NAME,
            informationText:
              "This completed demo project is seeded for reviewing final outcomes, marks, and feedback history.",
            moduleId: module.id,
            questionnaireTemplateId: template.id,
          },
          select: { id: true, questionnaireTemplateId: true },
        });

    const existingTeam = await prisma.team.findUnique({
      where: {
        enterpriseId_teamName: {
          enterpriseId: context.enterprise.id,
          teamName: SCENARIO_TEAM_NAME,
        },
      },
      select: { id: true },
    });

    const team = existingTeam
      ? await prisma.team.update({
          where: { id: existingTeam.id },
          data: { projectId: project.id },
          select: { id: true },
        })
      : await prisma.team.create({
          data: {
            enterpriseId: context.enterprise.id,
            projectId: project.id,
            teamName: SCENARIO_TEAM_NAME,
          },
          select: { id: true },
        });

    const existingAllocations = await prisma.teamAllocation.findMany({
      where: {
        teamId: team.id,
        userId: { in: memberIds },
      },
      select: { userId: true },
    });
    const existingAllocationIds = new Set(existingAllocations.map((allocation) => allocation.userId));
    const allocationsToCreate = memberIds
      .filter((userId) => !existingAllocationIds.has(userId))
      .map((userId) => ({ teamId: team.id, userId }));

    if (allocationsToCreate.length > 0) {
      await prisma.teamAllocation.createMany({
        data: allocationsToCreate,
        skipDuplicates: true,
      });
    }

    const deadline = await prisma.projectDeadline.findUnique({
      where: { projectId: project.id },
      select: { id: true },
    });
    if (!deadline) {
      const now = Date.now();
      const taskOpenDate = new Date(now - 45 * DAY_MS);
      const taskDueDate = new Date(now - 35 * DAY_MS);
      const assessmentOpenDate = new Date(now - 34 * DAY_MS);
      const assessmentDueDate = new Date(now - 28 * DAY_MS);
      const feedbackOpenDate = new Date(now - 27 * DAY_MS);
      const feedbackDueDate = new Date(now - 20 * DAY_MS);

      await prisma.projectDeadline.create({
        data: {
          projectId: project.id,
          taskOpenDate,
          taskDueDate,
          assessmentOpenDate,
          assessmentDueDate,
          feedbackOpenDate,
          feedbackDueDate,
        },
      });
    }

    const scenarioQuestions = await prisma.question.findMany({
      where: { templateId: project.questionnaireTemplateId },
      orderBy: { order: "asc" },
      select: { id: true, label: true, type: true, order: true, configs: true },
    });
    const questions: ScenarioQuestion[] =
      scenarioQuestions.length > 0
        ? scenarioQuestions
        : template.questionLabels.map((label, index) => ({
            id: index + 1,
            label,
            type: "text",
            order: index + 1,
            configs: null,
          }));

    const existingAssessments = await prisma.peerAssessment.findMany({
      where: {
        projectId: project.id,
        teamId: team.id,
      },
      select: {
        id: true,
        reviewerUserId: true,
        revieweeUserId: true,
      },
    });
    const assessmentIdByPair = new Map(
      existingAssessments.map((assessment) => [
        buildReviewPairKey(assessment.reviewerUserId, assessment.revieweeUserId),
        assessment.id,
      ])
    );
    const existingFeedbackIds = new Set(
      (
        await prisma.peerFeedback.findMany({
          where: { peerAssessmentId: { in: existingAssessments.map((assessment) => assessment.id) } },
          select: { peerAssessmentId: true },
        })
      ).map((feedback) => feedback.peerAssessmentId)
    );

    let createdAssessments = 0;
    let createdFeedbacks = 0;
    for (let reviewerIndex = 0; reviewerIndex < memberIds.length; reviewerIndex += 1) {
      const reviewerId = memberIds[reviewerIndex];
      if (!reviewerId) continue;
      for (let revieweeIndex = 0; revieweeIndex < memberIds.length; revieweeIndex += 1) {
        const revieweeId = memberIds[revieweeIndex];
        if (!revieweeId || reviewerId === revieweeId) continue;

        const answersJson = Object.fromEntries(
          questions.map((question, questionIndex) => [
            question.label,
            buildScenarioAnswer(question, reviewerId, revieweeId, questionIndex),
          ])
        );
        const pairKey = buildReviewPairKey(reviewerId, revieweeId);
        const existingAssessmentId = assessmentIdByPair.get(pairKey);
        const assessment = existingAssessmentId
          ? await prisma.peerAssessment.findUnique({
              where: { id: existingAssessmentId },
              select: { id: true },
            })
          : await prisma.peerAssessment.create({
              data: {
                projectId: project.id,
                teamId: team.id,
                reviewerUserId: reviewerId,
                revieweeUserId: revieweeId,
                templateId: project.questionnaireTemplateId,
                answersJson,
                submittedLate: false,
              },
              select: { id: true },
            });

        if (!assessment) continue;
        if (!existingAssessmentId) {
          assessmentIdByPair.set(pairKey, assessment.id);
          createdAssessments += 1;
        }

        if (!existingFeedbackIds.has(assessment.id)) {
          await prisma.peerFeedback.create({
            data: {
              teamId: team.id,
              peerAssessmentId: assessment.id,
              reviewerUserId: reviewerId,
              revieweeUserId: revieweeId,
              reviewText: buildFeedbackText(reviewerId, revieweeId),
              agreementsJson: buildAgreementPayload(reviewerId, revieweeId),
              submittedLate: false,
            },
          });
          existingFeedbackIds.add(assessment.id);
          createdFeedbacks += 1;
        }
      }
    }

    const teamMarking = await prisma.staffTeamMarking.findUnique({
      where: { teamId: team.id },
      select: { id: true },
    });
    if (!teamMarking) {
      await prisma.staffTeamMarking.create({
        data: {
          teamId: team.id,
          markerUserId: marker.id,
          mark: 78,
          formativeFeedback: "Completed project with strong delivery quality and clear team coordination.",
        },
      });
    }

    const studentIdSet = new Set(context.usersByRole.students.map((student) => student.id));
    const studentMemberIds = memberIds.filter((memberId) => studentIdSet.has(memberId));

    const existingStudentMarks = await prisma.staffStudentMarking.findMany({
      where: {
        teamId: team.id,
        studentUserId: { in: studentMemberIds },
      },
      select: { studentUserId: true },
    });
    const markedStudentIds = new Set(existingStudentMarks.map((record) => record.studentUserId));
    const studentMarksToCreate = studentMemberIds
      .filter((studentUserId) => !markedStudentIds.has(studentUserId))
      .map((studentUserId, index) => ({
        teamId: team.id,
        studentUserId,
        markerUserId: marker.id,
        mark: 70 + ((index + studentUserId) % 20),
        formativeFeedback: "Consistent contribution across implementation, communication, and team collaboration.",
      }));
    if (studentMarksToCreate.length > 0) {
      await prisma.staffStudentMarking.createMany({
        data: studentMarksToCreate,
        skipDuplicates: true,
      });
    }

    const organiserId = memberIds[0] ?? marker.id;
    const meetingSeedResult = await ensureScenarioMeetings(team.id, organiserId, memberIds);

    const createdProject = existingProject ? 0 : 1;
    const createdTeam = existingTeam ? 0 : 1;
    const createdDeadline = deadline ? 0 : 1;
    const createdTeamMarking = teamMarking ? 0 : 1;

    return {
      value: undefined,
      rows:
        createdProject +
        createdTeam +
        allocationsToCreate.length +
        createdDeadline +
        createdAssessments +
        createdFeedbacks +
        createdTeamMarking +
        studentMarksToCreate.length +
        meetingSeedResult.createdMeetings +
        meetingSeedResult.createdMinutes +
        meetingSeedResult.createdAttendances,
      details: `project=${project.id}, team=${team.id}, members=${memberIds.length}`,
    };
  });
}
