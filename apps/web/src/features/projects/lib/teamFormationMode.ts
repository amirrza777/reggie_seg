import type { ProjectOverviewDashboardProps, Project } from "@/features/projects/types";

type ProjectNavFlagsLike = {
  active?: { team?: boolean };
  completed?: { team?: boolean };
};

export function resolveStudentTeamFormationMode(
  project: Project | null | undefined,
): ProjectOverviewDashboardProps["teamFormationMode"] {
  if (!project) return "self";
  if (project.archivedAt || project.moduleArchivedAt) return "staff";
  if (project.teamAllocationQuestionnaireTemplateId) return "custom";

  const raw = project.projectNavFlags as ProjectNavFlagsLike | null;
  if (raw?.active?.team === false || raw?.completed?.team === false) return "staff";
  return "self";
}
