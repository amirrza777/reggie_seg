import type {
  DeadlineItem,
  Project,
  ProjectDeadline,
  StaffMarkingSummary,
  ProjectOverviewDashboardProps,
} from "../types";
import { Card } from "@/shared/ui/Card";
import { formatDateTime } from "@/shared/lib/dateFormatter";
import Link from "next/link";

type DisplayDeadlineState = {
  label: string;
  tone: "passed" | "soon" | "upcoming" | "muted";
};

function formatDateLabel(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Not set";
}

function getDeadlineStateLabel(value: string | null | undefined): DisplayDeadlineState {
  if (!value) return { label: "Unscheduled", tone: "muted" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: "Unknown", tone: "muted" };

  const now = new Date();
  if (date.getTime() < now.getTime()) {
    return { label: "Passed", tone: "passed" };
  }

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 2) {
    return { label: "Soon", tone: "soon" };
  }
  return { label: "Upcoming", tone: "upcoming" };
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
    <section className="project-overview-hero">
      <div className="stack project-overview-hero__stack">
        <div className="stack project-overview-hero__meta">
          <div className="project-overview-hero__top">
            <div className="project-overview-hero__chips">
              <span className="project-overview-hero__chip project-overview-hero__chip--muted">
                Project #{project.id}
              </span>
              <span
                className={`project-overview-hero__chip ${
                  deadline.isOverridden ? "project-overview-hero__chip--override" : "project-overview-hero__chip--default"
                }`}
              >
                {deadline.isOverridden ? "Deadlines overridden" : "Default deadlines"}
              </span>
            </div>
            <div className="project-overview-hero__actions">
              <Link href={`/projects/${project.id}/team-health`} className="project-overview-hero__action-link">
                Team Health
              </Link>
            </div>
          </div>
          <h1 className="project-overview-hero__title">{project?.name || "Project"}</h1>
          <p className="muted project-overview-hero__summary">
            {project?.summary?.trim() || "No project summary has been added yet."}
          </p>
        </div>

        <div className="project-overview-hero__facts">
          <div className="project-overview-hero__fact">
            <p className="muted project-overview-hero__fact-label">Team</p>
            <p className="project-overview-hero__fact-value project-overview-hero__fact-value--lg">{teamName || "Unassigned team"}</p>
          </div>
          <div className="project-overview-hero__fact">
            <p className="muted project-overview-hero__fact-label">Next deadline</p>
            <p className="project-overview-hero__fact-value">
              {nextDeadline ? nextDeadline.label : "No upcoming deadline"}
            </p>
            {nextDeadline ? (
              <p className="muted project-overview-hero__fact-meta">{formatDateLabel(nextDeadline.value)}</p>
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
      <div className="stack project-overview-schedule">
        {items.map((item) => {
          const state = getDeadlineStateLabel(item.value);
          return (
            <div key={item.label} className="project-overview-schedule__row">
              <div>
                <p className="project-overview-schedule__label">{item.label}</p>
                <p className="muted project-overview-schedule__group">{item.group}</p>
              </div>
              <p className="project-overview-schedule__date">{formatDateLabel(item.value)}</p>
              <span className={`project-overview-status project-overview-status--${state.tone}`}>
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
      <div className="project-overview-info">
        <div className="stack project-overview-info__body">
          <h4 className="project-overview-info__title">Expectations</h4>

          <p className="project-overview-info__paragraph">
            This project begins on Monday, 3 November 2025 and ends on Monday, 15 December 2025.
            This project contributes 15.0% to the overall module mark. The module organiser will
            have provided information on how the project is assessed.
          </p>

          <p className="project-overview-info__paragraph">
            Students are allocated to groups. The module organiser will normally inform students of
            the process used to allocate students to groups. The allocated groups will be assigned a
            name by the module organiser and it will not be possible to change this name.
          </p>

          <p className="project-overview-info__paragraph">
            Staff and students can organise group meetings. When the whole group meets, with or
            without a member of staff present, to discuss, plan and manage the project and to make
            key decisions, attendance should be taken and the meeting should be minuted.
          </p>

          <p className="project-overview-info__paragraph">
            Students are expected to register their shared remote Git repository. Platform links and
            contribution activity can be used to monitor and verify student engagement across the
            project timeline.
          </p>

          <p className="project-overview-info__paragraph">
            This project includes a peer assessment exercise in which students are expected to
            provide feedback about each of their team mates. Students will also have an opportunity
            to provide a confidential account of team experiences.
          </p>
        </div>
      </div>
    </Card>
  );
}

function markerName(marking: StaffMarkingSummary | null) {
  if (!marking) return "Staff";
  const fullName = `${marking.marker.firstName} ${marking.marker.lastName}`.trim();
  return fullName.length > 0 ? fullName : `Staff ${marking.marker.id}`;
}

function formatMarkingUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return formatDateTime(value);
}

function TutorMarkingCard({
  teamMarking,
  studentMarking,
}: {
  teamMarking: StaffMarkingSummary | null;
  studentMarking: StaffMarkingSummary | null;
}) {
  return (
    <Card title="Tutor marking and formative feedback">
      <div className="project-overview-marking">
        <section className="project-overview-marking__section">
          <h4 className="project-overview-marking__heading">Team feedback</h4>
          <p className="project-overview-marking__mark-line">
            <strong>Team mark:</strong>{" "}
            {teamMarking?.mark == null ? "Not yet published" : teamMarking.mark}
          </p>
          <p className="muted project-overview-marking__feedback">
            {teamMarking?.formativeFeedback ?? "No team-level formative feedback yet."}
          </p>
          {teamMarking ? (
            <p className="ui-note ui-note--muted project-overview-marking__meta">
              Updated by {markerName(teamMarking)} on{" "}
              {formatMarkingUpdatedAt(teamMarking.updatedAt)}
            </p>
          ) : null}
        </section>

        <section className="project-overview-marking__section">
          <h4 className="project-overview-marking__heading">Your individual feedback</h4>
          <p className="project-overview-marking__mark-line">
            <strong>Your mark:</strong>{" "}
            {studentMarking?.mark == null ? "Not yet published" : studentMarking.mark}
          </p>
          <p className="muted project-overview-marking__feedback">
            {studentMarking?.formativeFeedback ?? "No individual formative feedback yet."}
          </p>
          {studentMarking ? (
            <p className="ui-note ui-note--muted project-overview-marking__meta">
              Updated by {markerName(studentMarking)} on{" "}
              {formatMarkingUpdatedAt(studentMarking.updatedAt)}
            </p>
          ) : null}
        </section>
      </div>
    </Card>
  );
}

export function ProjectOverviewDashboard({ project, deadline, team, marking }: ProjectOverviewDashboardProps) {
  const deadlineItems = buildDeadlineItems(deadline);
  const nextDeadline = getNextDeadline(deadlineItems);

  return (
    <div className="stack project-overview-dashboard">
      <ProjectOverviewHero
        project={project}
        deadline={deadline}
        teamName={team.teamName}
        nextDeadline={nextDeadline}
      />

      <div className="project-overview-layout">
        <InformationBoardCard />

        <DeadlinesScheduleCard items={deadlineItems} />
      </div>

      <TutorMarkingCard
        teamMarking={marking?.teamMarking ?? null}
        studentMarking={marking?.studentMarking ?? null}
      />
    </div>
  );
}
