import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "@/features/modules/api/client";
import { getCalendarEvents } from "@/features/calendar/api/client";
import type { Module } from "@/features/modules/types";
import { EnterpriseAccessRecoveryPanel } from "@/features/auth/components/EnterpriseAccessRecoveryPanel";
import { StudentModulesOverviewClient } from "@/features/modules/components/StudentModulesOverviewClient";
import { Card } from "@/shared/ui/Card";
import { ArrowRightIcon } from "@/shared/ui/icons/ArrowRightIcon";
import { Table } from "@/shared/ui/Table";

const TYPE_LABEL: Record<string, string> = {
  task_open: "Task Opens",
  task_due: "Task Due",
  assessment_open: "Assessment Opens",
  assessment_due: "Assessment Due",
  feedback_open: "Feedback Opens",
  feedback_due: "Feedback Due",
  team_allocation_questionnaire_open: "Allocation Questionnaire Opens",
  team_allocation_questionnaire_due: "Allocation Questionnaire Due",
  meeting: "Meeting",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (user?.isUnassigned === true) {
    return (
      <div className="dashboard-unassigned-view">
        <div className="stack ui-page ui-page--narrow dashboard-unassigned-view__content">
          <Card title="Enterprise access is required">
            <EnterpriseAccessRecoveryPanel />
          </Card>
        </div>
      </div>
    );
  }

  let modules: Module[] = [];
  let moduleError: string | null = null;
  let upcomingRows: (string | ReactNode)[][] = [];

  if (user) {
    const [fetchedModules, events] = await Promise.allSettled([
      listModules(user.id),
      getCalendarEvents(user.id),
    ]);

    if (fetchedModules.status === "fulfilled") {
      modules = fetchedModules.value;
    } else {
      moduleError = "Could not load modules right now. This can happen if the latest database migrations have not been applied.";
    }

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
    <div className="stack stack--tabbed ui-page projects-panel">
      <header className="projects-panel__header">
        <h1 className="projects-panel__title">Modules overview</h1>
        <p className="projects-panel__subtitle">
          Quick view across modules, teams, meetings, and peer assessments.
        </p>
      </header>

      {user ? (
        <StudentModulesOverviewClient
          initialModules={modules}
          initialLoadError={moduleError}
          userId={user.id}
          canJoin={user.role === "STUDENT" || user.role === "ENTERPRISE_ADMIN" || user.role === "ADMIN"}
        />
      ) : null}

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
