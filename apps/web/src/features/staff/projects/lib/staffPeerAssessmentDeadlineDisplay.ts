import type { ProjectDeadline } from "@/features/projects/types";
import { formatDate } from "@/shared/lib/formatDate";

export type StaffPeerAssessmentDeadlineDisplay = {
  dateLabel: string;
  profile: "STANDARD" | "MCF";
};

export function buildStaffPeerAssessmentDeadlineDisplay(
  d: ProjectDeadline
): StaffPeerAssessmentDeadlineDisplay | null {
  const profile: StaffPeerAssessmentDeadlineDisplay["profile"] = d.deadlineProfile === "MCF" ? "MCF" : "STANDARD";
  const useMcf = profile === "MCF";
  const iso = useMcf
    ? (d.assessmentDueDateMcf ?? d.assessmentDueDate)
    : (d.assessmentDueDate ?? d.assessmentDueDateMcf);
  const dateLabel = formatDate(iso);
  if (!dateLabel) return null;
  return { dateLabel, profile };
}
