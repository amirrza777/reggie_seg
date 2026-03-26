"use client";

import { usePathname } from "next/navigation";

const SEGMENT_SUBTITLES: Record<string, string> = {
  "": "Team overview and quick actions",
  team: "Team member details",
  "team-meetings": "Meeting logs and attendance",
  "peer-assessment": "Assessments written and received by student",
  "peer-feedback": "Feedback progress and review evidence",
  grading: "Team and student grading",
  repositories: "Repository activity and contribution evidence",
  trello: "Task planning summary",
  teamhealth: "Warnings, messages, and team support signals",
  deadlines: "Per-student deadline adjustments and team profile",
};

/**
 * subtitle for header based on current path. So header can show section-specific text without each page passing it.
 */
export function TeamSectionSubtitle() {
  const pathname = usePathname();
  const segment = pathname?.split("/teams/")[1]?.split("/")[1] ?? "";
  const subtitle = SEGMENT_SUBTITLES[segment] ?? null;
  if (!subtitle) return null;
  return subtitle;
}
