// Student graphs: team distribution plus “your cards” (when Trello linked).

"use client";

import { useEffect, useState } from "react";
import { getMyTrelloMemberId } from "@/features/trello/api/client";
import { CardDistributionGraph } from "@/features/trello/components/CardDistributionGraph";
import { buildTrelloGraphProps } from "@/features/trello/lib/trelloGraphProps";
import type { BoardView } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";

type Props = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  deadline?: ProjectDeadline | null;
  integrationsReadOnly?: boolean; // prop compatibility, not used
  filterVariant?: "project" | "staff"; // staff shell; unused
  showIntegrationSettings?: boolean; // staff shell; unused
};

export function TrelloGraphsView({
  view,
  sectionConfig,
  deadline,
  integrationsReadOnly: _integrationsReadOnly,
  filterVariant: _filterVariant,
  showIntegrationSettings: _showIntegrationSettings,
}: Props) {
  const [myTrelloMemberId, setMyTrelloMemberId] = useState<string | null>(null);

  useEffect(() => {
    getMyTrelloMemberId()
      .then((res) => setMyTrelloMemberId(res.trelloMemberId ?? null))
      .catch(() => setMyTrelloMemberId(null));
  }, []);

  const graphProps = buildTrelloGraphProps(view, sectionConfig, deadline);

  return (
    <div className="stack">
      <CardDistributionGraph {...graphProps} />
      {myTrelloMemberId ? (
        <CardDistributionGraph
          {...graphProps}
          memberIdFilter={myTrelloMemberId}
          title="Your card distribution"
        />
      ) : null}
    </div>
  );
}
