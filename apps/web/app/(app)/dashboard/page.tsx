import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "@/features/modules/api/client";
import { getCalendarEvents } from "@/features/calendar/api/client";
import type { Module } from "@/features/modules/types";
import { StudentModulesOverviewClient } from "@/features/modules/components/StudentModulesOverviewClient";
import { Card } from "@/shared/ui/Card";
import { ArrowRightIcon } from "@/shared/ui/ArrowRightIcon";
import { Table } from "@/shared/ui/Table";

const TYPE_LABEL: Record<string, string> = {
  task_open: "Task Opens",
  task_due: "Task Due",
  assessment_open: "Assessment Opens",
  assessment_due: "Assessment Due",
  feedback_open: "Feedback Opens",
  feedback_due: "Feedback Due",
  meeting: "Meeting",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  let modules: Module[] = [];
  let upcomingRows: (string | ReactNode)[][] = [];

  if (user) {
    const [fetchedModules, events] = await Promise.allSettled([
      listModules(user.id),
      getCalendarEvents(user.id),
    ]);

    if (fetchedModules.status === "fulfilled") modules = fetchedModules.value;

    if (events.status === "fulfilled") {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() + 14);
      upcomingRows = events.value
        .filter((e) => {
          const d = new Date(e.date);
          return d >= now && d <= cutoff;
        })
        .slice(0, 8)
        .map((e) => [
          e.projectName ?? e.title,
          TYPE_LABEL[e.type] ?? e.type,
          formatDate(e.date),
        ]);
    }
  }

  if (upcomingRows.length === 0) {
    upcomingRows = [["-", "No upcoming deadlines in the next 14 days", "-"]];
  }

  return (
    <div className="stack stack--tabbed">
      <Card title={<span className="overview-title">Modules overview</span>}>
        <p className="muted">
          Quick view across modules, teams, meetings, and peer assessments.
        </p>
      </Card>

      {user ? <StudentModulesOverviewClient initialModules={modules} userId={user.id} canJoin={user.role === "STUDENT"} /> : null}

      <Card
        title="Upcoming deadlines"
        action={
          <Link href="/calendar" className="btn btn--sm btn--ghost">
            View calendar <ArrowRightIcon />
          </Link>
        }
      >
        <Table headers={["Project", "Type", "Due"]} rows={upcomingRows} />
      </Card>
    </div>
  );
}
