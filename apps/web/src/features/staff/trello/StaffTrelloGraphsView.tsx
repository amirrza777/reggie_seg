/** Staff graphs: whole team graph plus one per board member */

"use client";

import { CardDistributionGraph } from "@/features/trello/components/CardDistributionGraph";
import { buildTrelloGraphProps } from "@/features/trello/lib/trelloGraphProps";
import type { BoardView } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";

type Props = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
  onRequestChangeAccount?: () => void;
  deadline?: ProjectDeadline | null;
  integrationsReadOnly?: boolean;
  showIntegrationSettings?: boolean;
  filterVariant?: "project" | "staff";
};

export function StaffTrelloGraphsView({
  view,
  sectionConfig,
  deadline,
  integrationsReadOnly: _ir,
  showIntegrationSettings: _si,
  filterVariant: _fv,
}: Props) {
  const graphProps = buildTrelloGraphProps(view, sectionConfig, deadline);
  const members = view.board.members ?? [];

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
