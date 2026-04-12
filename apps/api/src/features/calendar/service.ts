import { prisma } from "../../shared/db.js";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type:
    | "task_open"
    | "task_due"
    | "assessment_open"
    | "assessment_due"
    | "feedback_open"
    | "feedback_due"
    | "team_allocation_questionnaire_open"
    | "team_allocation_questionnaire_due"
    | "meeting";
  projectName?: string;
};

function fmt(date: Date): string {
  return date.toISOString();
}

async function buildTeamAllocationEvents(
  userId: number,
  seen: Set<string>
): Promise<CalendarEvent[]> {
  const teams = await prisma.teamAllocation.findMany({
    where: { userId },
    select: {
      team: {
        select: {
          project: { select: { id: true, name: true, deadline: true } },
          deadlineOverride: true,
        },
      },
    },
  });

  const events: CalendarEvent[] = [];
  for (const allocation of teams) {
    const { project, deadlineOverride } = allocation.team;
    if (!project.deadline) continue;

    const pairs: Array<
      [string, "task_open" | "task_due" | "assessment_open" | "assessment_due" | "feedback_open" | "feedback_due", Date]
    > = [
      [`${project.id}-task_open`, "task_open", deadlineOverride?.taskOpenDate ?? project.deadline.taskOpenDate],
      [`${project.id}-task_due`, "task_due", deadlineOverride?.taskDueDate ?? project.deadline.taskDueDate],
      [`${project.id}-assessment_open`, "assessment_open", deadlineOverride?.assessmentOpenDate ?? project.deadline.assessmentOpenDate],
      [`${project.id}-assessment_due`, "assessment_due", deadlineOverride?.assessmentDueDate ?? project.deadline.assessmentDueDate],
      [`${project.id}-feedback_open`, "feedback_open", deadlineOverride?.feedbackOpenDate ?? project.deadline.feedbackOpenDate],
      [`${project.id}-feedback_due`, "feedback_due", deadlineOverride?.feedbackDueDate ?? project.deadline.feedbackDueDate],
    ];

    const labels: Record<string, string> = {
      task_open: "Task Opens",
      task_due: "Task Due",
      assessment_open: "Assessment Opens",
      assessment_due: "Assessment Due",
      feedback_open: "Feedback Opens",
      feedback_due: "Feedback Due",
    };

    for (const [key, type, date] of pairs) {
      if (!seen.has(key)) {
        seen.add(key);
        events.push({
          id: key,
          title: `${labels[type]} – ${project.name}`,
          date: fmt(date),
          type,
          projectName: project.name,
        });
      }
    }
  }
  return events;
}

async function buildQuestionnaireEvents(
  userId: number,
  seen: Set<string>
): Promise<CalendarEvent[]> {
  const memberships = await prisma.projectStudent.findMany({
    where: { userId },
    select: {
      project: {
        select: {
          id: true,
          name: true,
          teamAllocationQuestionnaireTemplateId: true,
          deadline: {
            select: {
              teamAllocationQuestionnaireOpenDate: true,
              teamAllocationQuestionnaireDueDate: true,
            },
          },
        },
      },
    },
  });

  const events: CalendarEvent[] = [];
  const labels: Record<string, string> = {
    team_allocation_questionnaire_open: "Team Allocation Questionnaire Opens",
    team_allocation_questionnaire_due: "Team Allocation Questionnaire Due",
  };

  for (const m of memberships) {
    if (!m.project.teamAllocationQuestionnaireTemplateId) continue;
    const openDate = m.project.deadline?.teamAllocationQuestionnaireOpenDate;
    const dueDate = m.project.deadline?.teamAllocationQuestionnaireDueDate;

    const pairs: Array<[string, string, Date | null]> = [
      [`${m.project.id}-team_allocation_questionnaire_open`, "team_allocation_questionnaire_open", openDate ?? null],
      [`${m.project.id}-team_allocation_questionnaire_due`, "team_allocation_questionnaire_due", dueDate ?? null],
    ];

    for (const [key, type, date] of pairs) {
      if (date && !seen.has(key)) {
        seen.add(key);
        events.push({
          id: key,
          title: `${labels[type]} - ${m.project.name}`,
          date: fmt(date),
          type: type as any,
          projectName: m.project.name,
        });
      }
    }
  }
  return events;
}

async function buildMeetingEvents(userId: number): Promise<CalendarEvent[]> {
  const meetings = await prisma.meeting.findMany({
    where: { OR: [{ organiserId: userId }, { attendances: { some: { userId } } }] },
    select: {
      id: true,
      title: true,
      date: true,
      team: { select: { project: { select: { name: true } } } },
    },
  });

  return meetings.map((m) => ({
    id: `meeting-${m.id}`,
    title: m.title,
    date: fmt(m.date),
    type: "meeting" as const,
    projectName: m.team.project.name,
  }));
}

/** Returns the calendar events for user. */
export async function getCalendarEventsForUser(userId: number): Promise<CalendarEvent[]> {
  const seen = new Set<string>();
  const [teamEvents, questionnaireEvents, meetingEvents] = await Promise.all([
    buildTeamAllocationEvents(userId, seen),
    buildQuestionnaireEvents(userId, seen),
    buildMeetingEvents(userId),
  ]);

  const events = [...teamEvents, ...questionnaireEvents, ...meetingEvents];
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
