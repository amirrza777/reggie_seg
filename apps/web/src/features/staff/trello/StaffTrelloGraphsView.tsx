"use client";

import { CardDistributionGraph } from "@/features/trello/components/CardDistributionGraph";
import type { BoardView } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";

/** Staff graphs: all-cards graph plus one graph per board member (instead of current user only). */
type Props = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
  onRequestChangeAccount?: () => void;
  deadline?: ProjectDeadline | null;
};

export function StaffTrelloGraphsView({ view, sectionConfig, deadline }: Props) {
  const { cardsByList, listNamesById, actionsByDate, board } = view;
  const projectStartDate = deadline?.taskOpenDate?.trim()?.slice(0, 10) ?? undefined;
  const projectEndDate = deadline?.taskDueDate?.trim()?.slice(0, 10) ?? undefined;

  const graphProps = {
    actionsByDate,
    listNamesById,
    cardsByList,
    sectionConfig,
    projectStartDate,
    projectEndDate,
  };

  const members = board.members ?? [];

  return (
    <div className="stack">
      <CardDistributionGraph {...graphProps} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {members.map((member) => (
          <CardDistributionGraph
            key={member.id}
            {...graphProps}
            memberIdFilter={member.id}
            title={member.fullName || member.initials || `Member ${member.id}`}
          />
        ))}
      </div>
    </div>
  );
}
