"use client";

import { useEffect, useState } from "react";
import { getMyTrelloMemberId } from "@/features/trello/api/client";
import { CardDistributionGraph } from "@/features/trello/components/CardDistributionGraph";
import type { BoardView } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";

type Props = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  deadline?: ProjectDeadline | null;
  integrationsReadOnly?: boolean;
};

export function TrelloGraphsView({ view, sectionConfig, deadline }: Props) {
  const { cardsByList, listNamesById, actionsByDate } = view;
  const [myTrelloMemberId, setMyTrelloMemberId] = useState<string | null>(null);
  const projectStartDate = deadline?.taskOpenDate?.trim()?.slice(0, 10) ?? undefined;
  const projectEndDate = deadline?.taskDueDate?.trim()?.slice(0, 10) ?? undefined;

  useEffect(() => {
    getMyTrelloMemberId()
      .then((res) => setMyTrelloMemberId(res.trelloMemberId ?? null))
      .catch(() => setMyTrelloMemberId(null));
  }, []);

  const graphProps = {
    actionsByDate,
    listNamesById,
    cardsByList,
    sectionConfig,
    projectStartDate,
    projectEndDate,
  };

  return (
    <div className="stack">
      <CardDistributionGraph {...graphProps} />
      {myTrelloMemberId && (
        <CardDistributionGraph
          {...graphProps}
          memberIdFilter={myTrelloMemberId}
          title="Your card distribution"
        />
      )}
    </div>
  );
}
