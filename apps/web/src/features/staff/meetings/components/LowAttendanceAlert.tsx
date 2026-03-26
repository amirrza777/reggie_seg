import type { FlaggedMember } from "../types";

type LowAttendanceAlertProps = {
  flaggedMembers: FlaggedMember[];
  absenceThreshold: number;
};

export function LowAttendanceAlert({ flaggedMembers, absenceThreshold }: LowAttendanceAlertProps) {
  if (flaggedMembers.length === 0) return null;

  const heading = flaggedMembers.length === 1
    ? "1 member"
    : `${flaggedMembers.length} members`;

  return (
    <div className="low-attendance-alert">
      <p className="low-attendance-alert__title">
        {heading} with {absenceThreshold}+ consecutive absences
      </p>
      <div className="low-attendance-alert__list">
        {flaggedMembers.map((member) => (
          <div key={member.id} className="low-attendance-alert__item">
            <span>{member.firstName} {member.lastName}</span>
            <span className="low-attendance-alert__count">{member.consecutiveAbsences} in a row</span>
          </div>
        ))}
      </div>
    </div>
  );
}
