import type { CalendarEvent } from "../api/client";

type Props = {
  events: CalendarEvent[];
  title?: string;
};

const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  task_open:        "Task Opens",
  task_due:         "Task Due",
  assessment_open:  "Assessment Opens",
  assessment_due:   "Assessment Due",
  feedback_open:    "Feedback Opens",
  feedback_due:     "Feedback Due",
  team_allocation_questionnaire_open: "Allocation Questionnaire Opens",
  team_allocation_questionnaire_due: "Allocation Questionnaire Due",
  meeting:          "Meeting",
};

const TYPE_BADGE: Record<CalendarEvent["type"], string> = {
  task_open:        "calendar-badge--info",
  task_due:         "calendar-badge--danger",
  assessment_open:  "calendar-badge--info",
  assessment_due:   "calendar-badge--warning",
  feedback_open:    "calendar-badge--info",
  feedback_due:     "calendar-badge--success",
  team_allocation_questionnaire_open: "calendar-badge--info",
  team_allocation_questionnaire_due: "calendar-badge--warning",
  meeting:          "calendar-badge--purple",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function UpcomingList({ events, title = "Upcoming" }: Props) {
  return (
    <>
      <div className="upcoming-list-header">
        <h3 className="upcoming-list__title">{title}</h3>
      </div>
      <div className="upcoming-list-body">
        {events.length === 0 ? (
          <p className="upcoming-list__empty">No events.</p>
        ) : (
          <ul className="upcoming-list__items">
            {events.map((e) => (
              <li key={e.id} className="upcoming-item">
                <div className="upcoming-item__date">{formatDate(e.date)}</div>
                <div className="upcoming-item__body">
                  <span className={`calendar-badge ${TYPE_BADGE[e.type]}`}>{TYPE_LABEL[e.type]}</span>
                  <span className="upcoming-item__title">{e.projectName ?? e.title}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
