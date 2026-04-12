import type { ProjectOverviewDashboardProps, Project } from "@/features/projects/types";

type ProjectNavFlagsLike = {
  active?: { team?: boolean };
  completed?: { team?: boolean };
  peerModes?: { peer_assessment?: string };
};

export function resolveStudentTeamFormationMode(
  project: Project | null | undefined,
): ProjectOverviewDashboardProps["teamFormationMode"] {
  if (!project) return "self";
  if (project.archivedAt || project.moduleArchivedAt) return "staff";
  if (project.teamAllocationQuestionnaireTemplateId) return "custom";

  const raw = project.projectNavFlags as ProjectNavFlagsLike | null;
  const peerAssessmentMode = raw?.peerModes?.peer_assessment;
  if (peerAssessmentMode === "MANUAL") return "custom";
  if (raw?.active?.team === false || raw?.completed?.team === false) return "staff";
  return "self";
}
