// Counts cards per category in current board state.

import { getListStatus } from "./listStatus";

export type CardCountByStatus = {
  total: number;
  backlog: number;
  inProgress: number;
  completed: number;
  informationOnly: number;
};

export function countCardsByStatus(
  cardsByList: Record<string, { id: string }[]>,
  listNamesById: Record<string, string>,
  sectionConfig: Record<string, string>
): CardCountByStatus {
  const counts: CardCountByStatus = { total: 0, backlog: 0, inProgress: 0, completed: 0, informationOnly: 0 };
  for (const [listId, cards] of Object.entries(cardsByList)) {
    const status = getListStatus(listNamesById[listId] ?? "", sectionConfig);
    const n = cards.length;
    counts.total += n;
    if (status === "backlog") counts.backlog += n;
    else if (status === "completed") counts.completed += n;
    else if (status === "inProgress") counts.inProgress += n;
    else if (status === null) counts.informationOnly += n;
  }
  return counts;
}
