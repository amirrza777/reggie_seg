"use client";

import { usePathname } from "next/navigation";

const SEGMENT_SUBTITLES: Record<string, string> = {
  "": "Team overview and quick actions",
  team: "Team member details",
  "team-meetings": "Meeting logs and attendance",
  "meeting-scheduler": "Scheduling and slot management",
  "peer-assessment": "Submission progress by student",
  grading: "Team and student grading",
  "peer-feedback": "Feedback review completion",
  repositories: "Repository activity and contribution evidence",
  trello: "Task planning summary",
};

/**
 * subtitle for header based on current path. So header can show section-specific text without each page passing it.
 */
export function TeamSectionSubtitle() {
  const pathname = usePathname();
  const segment = pathname?.split("/teams/")[1]?.split("/")[1] ?? "";
  const subtitle = SEGMENT_SUBTITLES[segment] ?? null;
  if (!subtitle) return null;
  return <p className="staff-projects__desc">{subtitle}</p>;
}
