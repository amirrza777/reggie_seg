//  `CardDistributionGraph` input props from `BoardView` + optional project deadline window.

import type { BoardView } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";

function deadlineDatePrefix(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 10);
}

export function buildTrelloGraphProps(
  view: BoardView,
  sectionConfig: Record<string, string>,
  deadline?: ProjectDeadline | null,
) {
  const { cardsByList, listNamesById, actionsByDate } = view;
  const projectStartDate = deadlineDatePrefix(deadline?.taskOpenDate ?? null);
  const projectEndDate = deadlineDatePrefix(deadline?.taskDueDate ?? null);

  return {
    actionsByDate,
    listNamesById,
    cardsByList,
    sectionConfig,
    projectStartDate,
    projectEndDate,
  };
}
