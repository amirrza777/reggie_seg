import Link from "next/link";
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

const marks = [
  { code: "MOD-3101", assessment: "Sprint review", mark: "72%" },
  { code: "MOD-2240", assessment: "Data structures quiz", mark: "68%" },
  { code: "MOD-4120", assessment: "Portfolio checkpoint", mark: "74%" },
];

type DashboardPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolvedSearchParams?.tab === "marks" ? "marks" : "expectations";
  const moduleRows = activeModules.map((mod) => [mod.id, mod.title, `${mod.teams} teams`]);
  const scheduleRows = upcomingItems.map((item) => [item.label, item.due, item.owner]);
  const markRows = marks.map((item) => [item.code, item.assessment, item.mark]);

  return (
    <div className="stack">
      <nav className="pill-nav" aria-label="Dashboard sections">
        <Link
          href="/dashboard"
          className={`pill-nav__link${activeTab === "expectations" ? " pill-nav__link--active" : ""}`}
          aria-current={activeTab === "expectations" ? "page" : undefined}
        >
          Expectations
        </Link>
        <Link
          href="/dashboard?tab=marks"
          className={`pill-nav__link${activeTab === "marks" ? " pill-nav__link--active" : ""}`}
          aria-current={activeTab === "marks" ? "page" : undefined}
        >
          Marks
        </Link>
      </nav>

      {activeTab === "expectations" ? (
        <>
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
        </>
      ) : (
        <>
          <Card title={<span className="overview-title">Marks overview</span>}>
            <p className="muted">
              Current marks across your modules.
            </p>
          </Card>

          <Card title="Latest marks">
            <Table headers={["Code", "Assessment", "Mark"]} rows={markRows} />
          </Card>
        </>
      )}
    </div>
  );
}
