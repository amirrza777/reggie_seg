import type {
  DeadlineItem,
  DeadlineState,
  Project,
  ProjectDeadline,
  ProjectOverviewDashboardProps,
  Team,
} from "../types";
import { Card } from "@/shared/ui/Card";
import { formatDateTime } from "@/shared/lib/dateFormatter";

function formatDateLabel(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Not set";
}

function getDeadlineStateLabel(value: string | null | undefined): DeadlineState {
  if (!value) return { label: "Unscheduled", color: "var(--muted)" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: "Unknown", color: "var(--muted)" };

  const now = new Date();
  if (date.getTime() < now.getTime()) {
    return { label: "Passed", color: "#ef4444" };
  }

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 2) {
    return { label: "Soon", color: "#f59e0b" };
  }
  return { label: "Upcoming", color: "#10b981" };
}

function buildDeadlineItems(deadline: ProjectDeadline): DeadlineItem[] {
  return [
    { label: "Task opens", value: deadline.taskOpenDate, group: "Project" },
    { label: "Project deadline", value: deadline.taskDueDate, group: "Project" },
    { label: "Assessment opens", value: deadline.assessmentOpenDate, group: "Peer assessment" },
    { label: "Assessment deadline", value: deadline.assessmentDueDate, group: "Peer assessment" },
    { label: "Feedback opens", value: deadline.feedbackOpenDate, group: "Feedback" },
    { label: "Feedback deadline", value: deadline.feedbackDueDate, group: "Feedback" },
  ];
}

function sortTeammates(team: Team) {
  return [...(team.allocations || [])].sort((a, b) => {
    const aName = `${a.user.firstName} ${a.user.lastName}`.trim().toLowerCase();
    const bName = `${b.user.firstName} ${b.user.lastName}`.trim().toLowerCase();
    return aName.localeCompare(bName);
  });
}

function getNextDeadline(deadlineItems: DeadlineItem[]) {
  return deadlineItems
    .filter((item) => item.value)
    .map((item) => ({ ...item, date: new Date(item.value as string) }))
    .filter((item) => !Number.isNaN(item.date.getTime()) && item.date.getTime() >= Date.now())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
}

function ProjectOverviewHero({
  project,
  deadline,
  teamName,
  teammateCount,
  nextDeadline,
}: {
  project: Project;
  deadline: ProjectDeadline;
  teamName: string;
  teammateCount: number;
  nextDeadline?: { label: string; value: string | null };
}) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 18,
        background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white 8%), var(--surface))",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="stack" style={{ gap: 14 }}>
        <div className="stack" style={{ gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid var(--border)",
                padding: "4px 10px",
                fontSize: 12,
                color: "var(--muted)",
                background: "var(--surface)",
              }}
            >
              Project #{project.id}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid var(--border)",
                padding: "4px 10px",
                fontSize: 12,
                background: deadline.isOverridden ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: deadline.isOverridden ? "#b45309" : "#047857",
              }}
            >
              {deadline.isOverridden ? "Deadlines overridden" : "Default deadlines"}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 2.1vw, 2rem)", lineHeight: 1.1 }}>
            {project?.name || "Project"}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {project?.summary?.trim() || "No project summary has been added yet."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              background: "color-mix(in srgb, var(--surface) 88%, white 12%)",
            }}
          >
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Team
            </p>
            <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 18 }}>{teamName || "Unassigned team"}</p>
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              background: "color-mix(in srgb, var(--surface) 88%, white 12%)",
            }}
          >
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Members
            </p>
            <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 18 }}>{teammateCount}</p>
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              background: "color-mix(in srgb, var(--surface) 88%, white 12%)",
            }}
          >
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Next deadline
            </p>
            <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
              {nextDeadline ? nextDeadline.label : "No upcoming deadline"}
            </p>
            {nextDeadline ? (
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                {formatDateLabel(nextDeadline.value)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeadlinesScheduleCard({ items }: { items: DeadlineItem[] }) {
  return (
    <Card title="Deadlines and Schedule">
      <div className="stack" style={{ gap: 10 }}>
        {items.map((item) => {
          const state = getDeadlineStateLabel(item.value);
          return (
            <div
              key={item.label}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 12px",
                background: "var(--surface)",
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{item.label}</p>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                  {item.group}
                </p>
              </div>
              <p style={{ margin: 0 }}>{formatDateLabel(item.value)}</p>
              <span
                style={{
                  borderRadius: 999,
                  padding: "3px 9px",
                  border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                  color: state.color,
                  background: "var(--surface)",
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {state.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TeammatesCard({ team }: { team: Team }) {
  const teammates = sortTeammates(team);

  return (
    <Card title={`Teammates (${teammates.length})`}>
      {teammates.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No teammates found for this project team.
        </p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {teammates.map((allocation) => {
            const fullName = `${allocation.user.firstName} ${allocation.user.lastName}`.trim();
            return (
              <div
                key={allocation.userId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px minmax(0, 1fr)",
                  gap: 10,
                  alignItems: "center",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "var(--surface)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, white), color-mix(in srgb, var(--surface) 70%, var(--accent) 12%))",
                    border: "1px solid var(--border)",
                  }}
                >
                  {(allocation.user.firstName?.[0] || allocation.user.lastName?.[0] || "?").toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{fullName || allocation.user.email}</p>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                    {allocation.user.email}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function ProjectOverviewDashboard({ project, deadline, team }: ProjectOverviewDashboardProps) {
  const deadlineItems = buildDeadlineItems(deadline);
  const teammates = sortTeammates(team);
  const nextDeadline = getNextDeadline(deadlineItems);

  return (
    <div
      className="stack"
      style={{
        gap: 16,
        padding: 20,
        background:
          "radial-gradient(circle at 10% 10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 45%), var(--page-bg)",
      }}
    >
      <ProjectOverviewHero
        project={project}
        deadline={deadline}
        teamName={team.teamName}
        teammateCount={teammates.length}
        nextDeadline={nextDeadline}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <DeadlinesScheduleCard items={deadlineItems} />

        <TeammatesCard team={team} />
      </div>
    </div>
  );
}
