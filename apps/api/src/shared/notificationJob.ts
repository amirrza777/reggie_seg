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

export function startNotificationJob() {
  cron.schedule("0 8 * * *", async () => {
    try {
      await sendDeadlineReminders();
    } catch (err) {
      console.error("Notification job error:", err);
    }
  });
}
