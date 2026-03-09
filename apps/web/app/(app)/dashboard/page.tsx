import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

const upcomingItems = [
  { label: "Peer assessment submissions", due: "Fri 5 PM", owner: "ModuleLead" },
  { label: "Meeting minutes", due: "Today 6 PM", owner: "MeetingMinutes" },
  { label: "Team allocations sync", due: "Tomorrow", owner: "TeamAllocation" },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  let modules: Module[] = [];
  if (user) {
    try {
      modules = await listModules(user.id);
    } catch {
      modules = [];
    }
  }

  const moduleRows =
    modules.length > 0
      ? modules.map((module) => {
          const code = Number(module.id);
          const moduleCode = Number.isFinite(code) ? `MOD-${code}` : module.id;
          const teams = module.teamCount ?? 0;
          return [
            moduleCode,
            <Link key={module.id} href={`/modules/${encodeURIComponent(module.id)}`} className="ui-link-reset">
              {module.title}
            </Link>,
            `${teams} team${teams === 1 ? "" : "s"}`,
          ];
        })
      : [["-", "No modules assigned", "-"]];
  const scheduleRows = upcomingItems.map((item) => [item.label, item.due, item.owner]);

  return (
    <div className="stack stack--tabbed">
      <Card title={<span className="overview-title">Modules overview</span>}>
        <p className="muted">
          Quick view across modules, teams, meetings, and peer assessments.
        </p>
      </Card>

      <Card title="Active modules">
        <Table headers={["Code", "Title", "Teams"]} rows={moduleRows} />
      </Card>

      <Card title="Upcoming deadlines">
        <Table headers={["Item", "Due", "Model"]} rows={scheduleRows} />
      </Card>
    </div>
  );
}
