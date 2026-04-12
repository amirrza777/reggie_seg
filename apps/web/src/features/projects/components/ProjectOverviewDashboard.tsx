import type {
  DeadlineItem,
  Project,
  ProjectDeadline,
  StaffMarkingSummary,
  ProjectOverviewDashboardProps,
} from "../types";
import { Card } from "@/shared/ui/Card";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import { formatDateTime } from "@/shared/lib/dateFormatter";
import {
  resolveProjectMarkValue,
  resolveProjectWorkflowState,
  type ProjectWorkflowState,
} from "@/features/projects/lib/projectWorkflowState";

function formatDateLabel(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Not set";
}

function getDeadlineStateLabel(value: string | null | undefined): {
  label: string;
  tone: "passed" | "soon" | "upcoming" | "muted";
} {
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

function ProjectOverviewHero({
  project,
  state,
  team,
  mode,
}: {
  project: Project;
  state: ProjectWorkflowState;
  team: ProjectOverviewDashboardProps["team"];
  mode: NonNullable<ProjectOverviewDashboardProps["teamFormationMode"]>;
}) {
  const projectName = (project.name ?? "").trim() || "Project";
  const overviewTitle = `${projectName} Overview`;
  const moduleName =
    (project.moduleName ?? "").trim() || (Number.isFinite(Number(project.moduleId)) ? `Module ${project.moduleId}` : "Module");
  const teamName = (team?.teamName ?? "").trim();
  const teamStatus =
    teamName.length > 0
      ? teamName
      : mode === "custom"
        ? "Pending questionnaire allocation"
        : mode === "staff"
          ? "Pending staff allocation"
          : "Not assigned";
  const summary =
    state === "completed_unmarked"
      ? "Project complete. Final mark is awaiting publication."
      : state === "completed_marked"
        ? "Project complete. Final mark and feedback are available below."
        : state === "pending"
          ? "Project is pending. You can view details and prepare for upcoming work."
          : "Overview and key project information.";

  return (
    <section className="project-overview-hero">
      <div className="stack project-overview-hero__stack">
        <div className="stack project-overview-hero__meta">
          <h1 className="project-overview-hero__title">{overviewTitle}</h1>
          <p className="project-overview-hero__module-name">
            <span className="project-overview-hero__meta-label">Team:</span>
            <span className="project-overview-hero__meta-value">{teamStatus}</span>
          </p>
          <p className="project-overview-hero__module-name">
            <span className="project-overview-hero__meta-label">Module:</span>
            <span className="project-overview-hero__meta-value">{moduleName}</span>
          </p>
          <p className="project-overview-hero__summary">{summary}</p>
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
      <div className="project-overview-marking">
        <section className="project-overview-marking__section">
          <h4 className="project-overview-marking__heading">Team feedback</h4>
          <p className="project-overview-marking__mark-line">
            <strong>Team mark:</strong>{" "}
            {teamMarking?.mark == null ? "Not yet published" : teamMarking.mark}
          </p>
          <div className="muted project-overview-marking__feedback">
            {teamMarking?.formativeFeedback ? (
              <RichTextViewer content={teamMarking.formativeFeedback} />
            ) : (
              <p>No team-level formative feedback yet.</p>
            )}
          </div>
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
          <div className="muted project-overview-marking__feedback">
            {studentMarking?.formativeFeedback ? (
              <RichTextViewer content={studentMarking.formativeFeedback} />
            ) : (
              <p>No individual formative feedback yet.</p>
            )}
          </div>
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

function AwaitingMarkCard() {
  return (
    <Card title="Final marking status">
      <p className="project-overview-info__paragraph">
        This project is complete and currently awaiting final mark publication.
      </p>
    </Card>
  );
}

export function ProjectOverviewDashboard({
  project,
  deadline,
  marking,
  team,
  teamFormationMode,
}: ProjectOverviewDashboardProps) {
  const deadlineItems = buildDeadlineItems(deadline);
  const projectState = resolveProjectWorkflowState({
    project,
    deadline,
    markValue: resolveProjectMarkValue(marking),
  });
  const completed = projectState === "completed_unmarked" || projectState === "completed_marked";
  const teamMode = teamFormationMode ?? "self";

  return (
    <div className="stack project-overview-dashboard">
      <ProjectOverviewHero project={project} state={projectState} team={team} mode={teamMode} />

      <div className="stack project-overview-layout project-overview-layout--overview">
        <InformationBoardCard informationText={project.informationText} largeText />
        {!completed ? <DeadlinesScheduleCard items={deadlineItems} emphasize /> : null}
      </div>

      {projectState === "completed_marked" ? (
        <TutorMarkingCard teamMarking={marking?.teamMarking ?? null} studentMarking={marking?.studentMarking ?? null} />
      ) : null}
      {projectState === "completed_unmarked" ? <AwaitingMarkCard /> : null}
    </div>
  );
}
