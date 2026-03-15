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

const NO_REPO_THRESHOLD_DAYS = 14;
const NO_GITHUB_ACCOUNT_THRESHOLD_DAYS = 14;

async function sendNoRepoAlerts() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - NO_REPO_THRESHOLD_DAYS * 86_400_000);

  const projects = await prisma.project.findMany({
    where: {
      archivedAt: null,
      noRepoAlertSentAt: null,
      createdAt: { lte: cutoff },
      githubRepositories: { none: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      module: { select: { name: true } },
    },
  });

  if (projects.length === 0) return;

  await prisma.project.updateMany({
    where: { id: { in: projects.map((p) => p.id) } },
    data: { noRepoAlertSentAt: now },
  });

  const staffUsers = await prisma.user.findMany({
    where: { role: "STAFF" },
    select: { email: true, firstName: true },
  });

  for (const { email, firstName } of staffUsers) {
    const subject = `GitHub repo missing – ${projects.length} project${projects.length === 1 ? "" : "s"} have no linked repository`;
    const list = projects.map((p) => `• ${p.name} (${p.module.name}) – created ${Math.floor((now.getTime() - p.createdAt.getTime()) / 86_400_000)} days ago`).join("\n");
    const listHtml = projects.map((p) => `<li>${p.name} (${p.module.name}) – created ${Math.floor((now.getTime() - p.createdAt.getTime()) / 86_400_000)} days ago</li>`).join("");
    const text = `Hi ${firstName},\n\nThe following projects have been active for ${NO_REPO_THRESHOLD_DAYS}+ days but have no GitHub repository linked:\n\n${list}\n\nPlease remind the relevant teams to link their repository.\n`;
    const html = `<p>Hi ${firstName},</p><p>The following projects have been active for <strong>${NO_REPO_THRESHOLD_DAYS}+ days</strong> but have no GitHub repository linked:</p><ul>${listHtml}</ul><p>Please remind the relevant teams to link their repository.</p>`;
    await sendEmail({ to: email, subject, text, html });
  }
}

async function sendNoGithubAccountAlerts() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - NO_GITHUB_ACCOUNT_THRESHOLD_DAYS * 86_400_000);

  const teams = await prisma.team.findMany({
    where: {
      archivedAt: null,
      noGithubAccountAlertSentAt: null,
      createdAt: { lte: cutoff },
    },
    select: {
      id: true,
      teamName: true,
      createdAt: true,
      project: { select: { name: true } },
      allocations: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              githubAccount: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  type UnconnectedEntry = { teamName: string; projectName: string; members: string[] };
  const toAlert: number[] = [];
  const entries: UnconnectedEntry[] = [];

  for (const team of teams) {
    const unconnected = team.allocations
      .filter((a) => !a.user.githubAccount)
      .map((a) => `${a.user.firstName} ${a.user.lastName}`.trim() || a.user.email);

    if (unconnected.length > 0) {
      toAlert.push(team.id);
      entries.push({ teamName: team.teamName, projectName: team.project.name, members: unconnected });
    }
  }

  if (toAlert.length === 0) return;

  await prisma.team.updateMany({
    where: { id: { in: toAlert } },
    data: { noGithubAccountAlertSentAt: now },
  });

  const staffUsers = await prisma.user.findMany({
    where: { role: "STAFF" },
    select: { email: true, firstName: true },
  });

  for (const { email, firstName } of staffUsers) {
    const total = entries.reduce((sum, e) => sum + e.members.length, 0);
    const subject = `GitHub not connected – ${total} student${total === 1 ? "" : "s"} across ${entries.length} team${entries.length === 1 ? "" : "s"}`;
    let text = `Hi ${firstName},\n\nThe following students have not connected their GitHub accounts ${NO_GITHUB_ACCOUNT_THRESHOLD_DAYS}+ days after their team was created:\n\n`;
    let html = `<p>Hi ${firstName},</p><p>The following students have not connected their GitHub accounts <strong>${NO_GITHUB_ACCOUNT_THRESHOLD_DAYS}+ days</strong> after their team was created:</p>`;
    for (const entry of entries) {
      text += `${entry.teamName} (${entry.projectName}):\n${entry.members.map((m) => `  – ${m}`).join("\n")}\n\n`;
      html += `<p><strong>${entry.teamName}</strong> (${entry.projectName})</p><ul>${entry.members.map((m) => `<li>${m}</li>`).join("")}</ul>`;
    }
    text += `Log in to review your teams.\n`;
    html += `<p>Log in to review your teams.</p>`;
    await sendEmail({ to: email, subject, text, html });
  }
}

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
