import cron from "node-cron";
import { prisma } from "./db.js";
import { sendEmail } from "./email.js";

type DeadlineWindow = { label: string; offsetDays: number };

const WINDOWS: DeadlineWindow[] = [
  { label: "today", offsetDays: 0 },
  { label: "tomorrow", offsetDays: 1 },
  { label: "in 7 days", offsetDays: 7 },
];

function dayBounds(offsetDays: number): { gte: Date; lt: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function sendDeadlineReminders() {
  for (const window of WINDOWS) {
    const bounds = dayBounds(window.offsetDays);

    const deadlines = await prisma.projectDeadline.findMany({
      where: {
        OR: [
          { taskDueDate: bounds },
          { assessmentDueDate: bounds },
          { feedbackDueDate: bounds },
          { taskOpenDate: bounds },
          { assessmentOpenDate: bounds },
          { feedbackOpenDate: bounds },
        ],
      },
      include: {
        project: {
          select: {
            name: true,
            teams: {
              include: {
                allocations: {
                  include: {
                    user: { select: { id: true, email: true, firstName: true } },
                  },
                },
                deadlineOverride: true,
              },
            },
          },
        },
      },
    });

    const userEvents = new Map<string, { email: string; firstName: string; items: string[] }>();

    for (const deadline of deadlines) {
      for (const team of deadline.project.teams) {
        const override = team.deadlineOverride;

        const fields: Array<{ key: keyof typeof deadline; label: string }> = [
          { key: "taskOpenDate", label: "Task Opens" },
          { key: "taskDueDate", label: "Task Due" },
          { key: "assessmentOpenDate", label: "Assessment Opens" },
          { key: "assessmentDueDate", label: "Assessment Due" },
          { key: "feedbackOpenDate", label: "Feedback Opens" },
          { key: "feedbackDueDate", label: "Feedback Due" },
        ];

        const matchingLabels: string[] = [];
        for (const { key, label } of fields) {
          const effectiveDate = (override && override[key as keyof typeof override] instanceof Date
            ? override[key as keyof typeof override]
            : deadline[key]) as Date | null;

          if (effectiveDate && effectiveDate >= bounds.gte && effectiveDate < bounds.lt) {
            matchingLabels.push(`${label}: ${formatDate(effectiveDate)}`);
          }
        }

        if (matchingLabels.length === 0) continue;

        for (const allocation of team.allocations) {
          const { email, firstName, id } = allocation.user;
          const key = `${id}`;
          if (!userEvents.has(key)) {
            userEvents.set(key, { email, firstName, items: [] });
          }
          for (const ml of matchingLabels) {
            userEvents.get(key)!.items.push(`${ml} – ${deadline.project.name}`);
          }
        }
      }
    }

    for (const { email, firstName, items } of userEvents.values()) {
      if (items.length === 0) continue;
      const count = items.length;
      const subject = `Deadline reminder – ${count} item${count === 1 ? "" : "s"} due ${window.label}`;
      const text = `Hi ${firstName},\n\nYou have ${count} deadline${count === 1 ? "" : "s"} ${window.label}:\n\n${items.map((i) => `• ${i}`).join("\n")}\n\nLog in to view your calendar.\n`;
      const html = `<p>Hi ${firstName},</p><p>You have <strong>${count} deadline${count === 1 ? "" : "s"}</strong> ${window.label}:</p><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul><p>Log in to view your calendar.</p>`;
      await sendEmail({ to: email, subject, text, html });
    }
  }
}

const YELLOW_THRESHOLD_DAYS = 7;
const RED_THRESHOLD_DAYS = 14;

async function sendInactivityAlerts() {
  const now = new Date();

  const teams = await prisma.team.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      teamName: true,
      inactivityFlag: true,
      createdAt: true,
      project: { select: { name: true } },
      meetings: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  });

  const toYellow: number[] = [];
  const toRed: number[] = [];

  type FlaggedTeam = { teamName: string; projectName: string; daysInactive: number };
  const yellowTeams: FlaggedTeam[] = [];
  const redTeams: FlaggedTeam[] = [];

  for (const team of teams) {
    const lastActivity = team.meetings[0]?.date ?? team.createdAt;
    const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / 86_400_000);

    if (daysInactive >= RED_THRESHOLD_DAYS && team.inactivityFlag !== "RED") {
      toRed.push(team.id);
      redTeams.push({ teamName: team.teamName, projectName: team.project.name, daysInactive });
    } else if (daysInactive >= YELLOW_THRESHOLD_DAYS && team.inactivityFlag === "NONE") {
      toYellow.push(team.id);
      yellowTeams.push({ teamName: team.teamName, projectName: team.project.name, daysInactive });
    }
  }

  if (toYellow.length > 0) {
    await prisma.team.updateMany({ where: { id: { in: toYellow } }, data: { inactivityFlag: "YELLOW" } });
  }
  if (toRed.length > 0) {
    await prisma.team.updateMany({ where: { id: { in: toRed } }, data: { inactivityFlag: "RED" } });
  }

  const totalFlagged = yellowTeams.length + redTeams.length;
  if (totalFlagged === 0) return;

  const staffUsers = await prisma.user.findMany({
    where: { role: "STAFF" },
    select: { email: true, firstName: true },
  });

  for (const { email, firstName } of staffUsers) {
    const subject = `Team inactivity alert – ${totalFlagged} team${totalFlagged === 1 ? "" : "s"} require attention`;

    let text = `Hi ${firstName},\n\nThe following teams have had no meeting activity:\n`;
    let html = `<p>Hi ${firstName},</p><p>The following teams have had no meeting activity:</p>`;

    if (redTeams.length > 0) {
      text += `\nRED FLAG (14+ days inactive):\n${redTeams.map((t) => `• ${t.teamName} (${t.projectName}) – ${t.daysInactive} days`).join("\n")}\n`;
      html += `<p><strong>🚩 RED FLAG – 14+ days inactive</strong></p><ul>${redTeams.map((t) => `<li>${t.teamName} (${t.projectName}) – ${t.daysInactive} days</li>`).join("")}</ul>`;
    }

    if (yellowTeams.length > 0) {
      text += `\nYELLOW FLAG (7+ days inactive):\n${yellowTeams.map((t) => `• ${t.teamName} (${t.projectName}) – ${t.daysInactive} days`).join("\n")}\n`;
      html += `<p><strong>⚠️ YELLOW FLAG – 7+ days inactive</strong></p><ul>${yellowTeams.map((t) => `<li>${t.teamName} (${t.projectName}) – ${t.daysInactive} days</li>`).join("")}</ul>`;
    }

    text += `\nLog in to review and dismiss flags where appropriate.\n`;
    html += `<p>Log in to review and dismiss flags where appropriate.</p>`;

    await sendEmail({ to: email, subject, text, html });
  }
}

async function sendMissingPeerAssessmentAlerts() {
  const now = new Date();

  const teams = await prisma.team.findMany({
    where: {
      archivedAt: null,
      peerAssessmentAlertSentAt: null,
      project: {
        deadline: {
          assessmentDueDate: { lt: now },
        },
      },
    },
    select: {
      id: true,
      teamName: true,
      project: { select: { name: true } },
      allocations: {
        select: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
      peerAssessments: { select: { reviewerUserId: true } },
    },
  });

  type NonSubmitter = { studentName: string; teamName: string; projectName: string; submitted: number; expected: number };
  const nonSubmitters: NonSubmitter[] = [];

  for (const team of teams) {
    const members = team.allocations.map((a) => a.user);
    const n = members.length;
    if (n < 2) continue;
    const expected = n - 1;
    for (const member of members) {
      const submitted = team.peerAssessments.filter((pa) => pa.reviewerUserId === member.id).length;
      if (submitted < expected) {
        nonSubmitters.push({
          studentName: `${member.firstName} ${member.lastName}`.trim() || `Student ${member.id}`,
          teamName: team.teamName,
          projectName: team.project.name,
          submitted,
          expected,
        });
      }
    }
  }

  const checkedIds = teams.map((t) => t.id);
  if (checkedIds.length > 0) {
    await prisma.team.updateMany({
      where: { id: { in: checkedIds } },
      data: { peerAssessmentAlertSentAt: now },
    });
  }

  if (nonSubmitters.length === 0) return;

  const staffUsers = await prisma.user.findMany({
    where: { role: "STAFF" },
    select: { email: true, firstName: true },
  });

  for (const { email, firstName } of staffUsers) {
    const count = nonSubmitters.length;
    const subject = `Peer assessment alert – ${count} student${count === 1 ? "" : "s"} have not submitted`;
    const rows = nonSubmitters.map(
      (s) => `• ${s.studentName} (${s.teamName}, ${s.projectName}) – ${s.submitted}/${s.expected} submitted`
    );
    const text = `Hi ${firstName},\n\nThe following student${count === 1 ? "" : "s"} have not completed their peer assessments after the deadline:\n\n${rows.join("\n")}\n\nLog in to review their progress.\n`;
    const htmlRows = nonSubmitters
      .map((s) => `<li>${s.studentName} (${s.teamName}, ${s.projectName}) – ${s.submitted}/${s.expected} submitted</li>`)
      .join("");
    const html = `<p>Hi ${firstName},</p><p>The following student${count === 1 ? "" : "s"} have not completed their peer assessments after the deadline:</p><ul>${htmlRows}</ul><p>Log in to review their progress.</p>`;
    await sendEmail({ to: email, subject, text, html });
  }
}

/**
 * Placeholder for no-repository reminders.
 * Keep as a no-op until the final query and recipient rules are confirmed.
 */
async function sendNoRepoAlerts() {
  return;
}

/**
 * Placeholder for no-GitHub-account reminders.
 * Keep as a no-op until the final query and recipient rules are confirmed.
 */
async function sendNoGithubAccountAlerts() {
  return;
}

/** Starts the background notification scheduler for reminder and inactivity emails. */
export function startNotificationJob() {
  cron.schedule("0 8 * * *", async () => {
    try {
      await sendDeadlineReminders();
    } catch (err) {
      console.error("Notification job error:", err);
    }
    try {
      await sendInactivityAlerts();
    } catch (err) {
      console.error("Inactivity alert job error:", err);
    }
    try {
      await sendMissingPeerAssessmentAlerts();
    } catch (err) {
      console.error("Missing peer assessment alert job error:", err);
    }
    try {
      await sendNoRepoAlerts();
    } catch (err) {
      console.error("No-repo alert job error:", err);
    }
    try {
      await sendNoGithubAccountAlerts();
    } catch (err) {
      console.error("No-GitHub-account alert job error:", err);
    }
  });
}
