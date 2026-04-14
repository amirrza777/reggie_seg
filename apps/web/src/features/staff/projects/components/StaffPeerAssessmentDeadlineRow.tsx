import "../styles/peer-deadline.css";
import type { StaffPeerAssessmentDeadlineDisplay } from "../lib/staffPeerAssessmentDeadlineDisplay";

type Props = {
  display: StaffPeerAssessmentDeadlineDisplay | null | undefined;
};

/** due date plus a small Standard / MCF label. */
export function StaffPeerAssessmentDeadlineRow({ display }: Props) {
  if (!display) {
    return (
      <div className="staff-projects__peer-deadline-row staff-projects__peer-deadline-row--empty">
        <span className="staff-projects__peer-deadline-date">Deadline not set</span>
      </div>
    );
  }

  return (
    <div className="staff-projects__peer-deadline-row">
      <span className="staff-projects__peer-deadline-date">{display.dateLabel}</span>
      <span
        className={
          display.profile === "MCF"
            ? "staff-projects__policy-pill staff-projects__policy-pill--mcf"
            : "staff-projects__policy-pill"
        }
      >
        {display.profile === "MCF" ? "MCF" : "Standard"}
      </span>
    </div>
  );
}
