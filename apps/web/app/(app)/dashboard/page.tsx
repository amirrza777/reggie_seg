import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

const activeModules = [
  { id: "MOD-3101", title: "Software Engineering", teams: 8 },
  { id: "MOD-2240", title: "Data Structures", teams: 5 },
  { id: "MOD-4120", title: "PEP", teams: 4 },
];

const upcomingItems = [
  { label: "Peer assessment submissions", due: "Fri 5 PM", owner: "ModuleLead" },
  { label: "Meeting minutes", due: "Today 6 PM", owner: "MeetingMinutes" },
  { label: "Team allocations sync", due: "Tomorrow", owner: "TeamAllocation" },
];

export default function DashboardPage() {
  const moduleRows = activeModules.map((mod) => [mod.id, mod.title, `${mod.teams} teams`]);
  const scheduleRows = upcomingItems.map((item) => [item.label, item.due, item.owner]);

  return (
    <div className="stack">
      <Card title="Dashboard overview">
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
