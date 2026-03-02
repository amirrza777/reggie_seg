import type {
  DeadlineItem,
  DeadlineState,
  Project,
  ProjectDeadline,
  ProjectOverviewDashboardProps,
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
  nextDeadline,
}: {
  project: Project;
  deadline: ProjectDeadline;
  teamName: string;
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

function InformationBoardCard() {
  return (
    <Card title="Information Board">
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <div className="stack" style={{ gap: 14, padding: "14px 16px" }}>
          <h4 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>Expectations</h4>

          <p style={{ margin: 0, lineHeight: 1.6 }}>
            This project begins on Monday, 3 November 2025 and ends on Monday, 15 December 2025.
            This project contributes 15.0% to the overall module mark. The module organiser will
            have provided information on how the project is assessed.
          </p>

          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Students are allocated to groups. The module organiser will normally inform students of
            the process used to allocate students to groups. The allocated groups will be assigned a
            name by the module organiser and it will not be possible to change this name.
          </p>

          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Staff and students can organise group meetings. When the whole group meets, with or
            without a member of staff present, to discuss, plan and manage the project and to make
            key decisions, attendance should be taken and the meeting should be minuted.
          </p>

          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Students are expected to register their shared remote Git repository. Platform links and
            contribution activity can be used to monitor and verify student engagement across the
            project timeline.
          </p>

          <p style={{ margin: 0, lineHeight: 1.6 }}>
            This project includes a peer assessment exercise in which students are expected to
            provide feedback about each of their team mates. Students will also have an opportunity
            to provide a confidential account of team experiences.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function ProjectOverviewDashboard({ project, deadline, team }: ProjectOverviewDashboardProps) {
  const deadlineItems = buildDeadlineItems(deadline);
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
        <InformationBoardCard />

        <DeadlinesScheduleCard items={deadlineItems} />
      </div>
    </div>
  );
}
