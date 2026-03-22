import type {
  DeadlineItem,
  Project,
  ProjectDeadline,
  StaffMarkingSummary,
  ProjectOverviewDashboardProps,
} from "../types";
import { Card } from "@/shared/ui/Card";
import { formatDateTime } from "@/shared/lib/dateFormatter";

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

function isProjectCompleted(
  project: Project,
  deadline: ProjectDeadline,
  marking: ProjectOverviewDashboardProps["marking"],
) {
  if (project.archivedAt) return true;

  const dueCandidates = [deadline.taskDueDate, deadline.assessmentDueDate, deadline.feedbackDueDate]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  const hasPublishedMark = Boolean(
    marking?.teamMarking?.mark != null ||
    marking?.studentMarking?.mark != null ||
    (marking?.teamMarking?.formativeFeedback ?? "").trim().length > 0 ||
    (marking?.studentMarking?.formativeFeedback ?? "").trim().length > 0,
  );
  if (hasPublishedMark) return true;

  if (dueCandidates.length === 0) return false;
  const latestDue = dueCandidates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest,
  );
  return latestDue.getTime() < Date.now();
}

function ProjectOverviewHero({
  isCompleted,
}: {
  isCompleted: boolean;
}) {
  return (
    <section className="project-overview-hero">
      <div className="stack project-overview-hero__stack">
        <div className="stack project-overview-hero__meta">
          <h1 className="project-overview-hero__title">Project Overview</h1>
          {!isCompleted ? (
            <p className="muted project-overview-hero__summary">Overview and key project information.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DeadlinesScheduleCard({ items, emphasize = false }: { items: DeadlineItem[]; emphasize?: boolean }) {
  return (
    <Card title="Deadlines and Schedule">
      <div className={`stack project-overview-schedule${emphasize ? " project-overview-schedule--expanded" : ""}`}>
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

function InformationBoardCard({
  informationText,
  largeText = false,
}: {
  informationText?: string | null;
  largeText?: boolean;
}) {
  const displayText = (informationText ?? "").trim();
  const paragraphs = displayText
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return (
    <Card title="Information Board" className="project-overview-info-card">
      <div className={`project-overview-info__body${largeText ? " project-overview-info__body--large" : ""}`}>
        {paragraphs.length > 0 ? (
          <div className="project-overview-info__content-box">
            {paragraphs.map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 16)}`}
                className={`project-overview-info__paragraph${largeText ? " project-overview-info__paragraph--large" : ""}`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="project-overview-info__empty">
            No information board content has been published for this project yet.
          </p>
        )}
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
      <div className="stack" style={{ gap: 14 }}>
        <section className="stack" style={{ gap: 6 }}>
          <h4 style={{ margin: 0 }}>Team feedback</h4>
          <p>
            <strong>Team mark:</strong>{" "}
            {teamMarking?.mark == null ? "Not yet published" : teamMarking.mark}
          </p>
          <p className="muted">
            {teamMarking?.formativeFeedback ?? "No team-level formative feedback yet."}
          </p>
          {teamMarking ? (
            <p className="ui-note ui-note--muted">
              Updated by {markerName(teamMarking)} on{" "}
              {formatMarkingUpdatedAt(teamMarking.updatedAt)}
            </p>
          ) : null}
        </section>

        <section className="stack" style={{ gap: 6 }}>
          <h4 style={{ margin: 0 }}>Your individual feedback</h4>
          <p>
            <strong>Your mark:</strong>{" "}
            {studentMarking?.mark == null ? "Not yet published" : studentMarking.mark}
          </p>
          <p className="muted">
            {studentMarking?.formativeFeedback ?? "No individual formative feedback yet."}
          </p>
          {studentMarking ? (
            <p className="ui-note ui-note--muted">
              Updated by {markerName(studentMarking)} on{" "}
              {formatMarkingUpdatedAt(studentMarking.updatedAt)}
            </p>
          ) : null}
        </section>
      </div>
    </Card>
  );
}

export function ProjectOverviewDashboard({
  project,
  deadline,
  marking,
}: ProjectOverviewDashboardProps) {
  const deadlineItems = buildDeadlineItems(deadline);
  const completed = isProjectCompleted(project, deadline, marking);

  return (
    <div className="stack project-overview-dashboard">
      <ProjectOverviewHero
        isCompleted={completed}
      />

      {completed ? (
        <TutorMarkingCard
          teamMarking={marking?.teamMarking ?? null}
          studentMarking={marking?.studentMarking ?? null}
        />
      ) : null}

      {!completed ? (
        <div className="stack project-overview-layout project-overview-layout--overview">
          <InformationBoardCard informationText={project.informationText} largeText />
          <DeadlinesScheduleCard items={deadlineItems} emphasize />
        </div>
      ) : null}
    </div>
  );
}
