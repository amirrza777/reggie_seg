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
    | "meeting";
  projectName?: string;
};

function fmt(date: Date): string {
  return date.toISOString();
}

/** Returns the calendar events for user. */
export async function getCalendarEventsForUser(userId: number): Promise<CalendarEvent[]> {
  const teams = await prisma.teamAllocation.findMany({
    where: { userId },
    select: {
      team: {
        select: {
          id: true,
          project: {
            select: {
              id: true,
              name: true,
              deadline: {
                select: {
                  taskOpenDate: true,
                  taskDueDate: true,
                  assessmentOpenDate: true,
                  assessmentDueDate: true,
                  feedbackOpenDate: true,
                  feedbackDueDate: true,
                },
              },
            },
          },
          deadlineOverride: {
            select: {
              taskOpenDate: true,
              taskDueDate: true,
              assessmentOpenDate: true,
              assessmentDueDate: true,
              feedbackOpenDate: true,
              feedbackDueDate: true,
            },
          },
        },
      },
    },
  });

  const events: CalendarEvent[] = [];
  const seen = new Set<string>();

  for (const allocation of teams) {
    const { project, deadlineOverride } = allocation.team;
    const base = project.deadline;
    if (!base) continue;

    const d = deadlineOverride;
    const projectName = project.name;
    const pid = project.id;

    const pairs: Array<[string, "task_open" | "task_due" | "assessment_open" | "assessment_due" | "feedback_open" | "feedback_due", Date]> = [
      [`${pid}-task_open`, "task_open", d?.taskOpenDate ?? base.taskOpenDate],
      [`${pid}-task_due`, "task_due", d?.taskDueDate ?? base.taskDueDate],
      [`${pid}-assessment_open`, "assessment_open", d?.assessmentOpenDate ?? base.assessmentOpenDate],
      [`${pid}-assessment_due`, "assessment_due", d?.assessmentDueDate ?? base.assessmentDueDate],
      [`${pid}-feedback_open`, "feedback_open", d?.feedbackOpenDate ?? base.feedbackOpenDate],
      [`${pid}-feedback_due`, "feedback_due", d?.feedbackDueDate ?? base.feedbackDueDate],
    ];

    for (const [key, type, date] of pairs) {
      if (seen.has(key)) continue;
      seen.add(key);

      const label: Record<typeof type, string> = {
        task_open: "Task Opens",
        task_due: "Task Due",
        assessment_open: "Assessment Opens",
        assessment_due: "Assessment Due",
        feedback_open: "Feedback Opens",
        feedback_due: "Feedback Due",
      };

      events.push({
        id: key,
        title: `${label[type]} – ${projectName}`,
        date: fmt(date),
        type,
        projectName,
      });
    }
  }

  const meetings = await prisma.meeting.findMany({
    where: {
      OR: [
        { organiserId: userId },
        { attendances: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      title: true,
      date: true,
      team: { select: { project: { select: { name: true } } } },
    },
  });

  for (const m of meetings) {
    events.push({
      id: `meeting-${m.id}`,
      title: m.title,
      date: fmt(m.date),
      type: "meeting",
      projectName: m.team.project.name,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
