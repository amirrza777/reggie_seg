"use client";

import type { BoardView } from "@/features/trello/api/client";
import type { ProjectDeadline } from "@/features/projects/types";
import { useTrelloSummaryData } from "@/features/trello/hooks/useTrelloSummaryData";
import { SummaryCardsBlock } from "./TrelloSummaryView/SummaryCardsBlock";
import { SummaryCardsByStatusChart } from "./TrelloSummaryView/SummaryCardsByStatusChart";
import { SummaryVelocityBlock } from "./TrelloSummaryView/SummaryVelocityBlock";
import { SummaryCumulativeChart } from "./TrelloSummaryView/SummaryCumulativeChart";
import { SummarySettings } from "./TrelloSummaryView/SummarySettings";

type Props = {
  projectId: string;
  view: BoardView;
  sectionConfig: Record<string, string>;
  onRequestChangeBoard: () => void;
  onRequestChangeAccount?: () => void;
  deadline?: ProjectDeadline | null;
  integrationsReadOnly?: boolean;
};

export function TrelloSummaryView({
  projectId,
  view,
  sectionConfig,
  onRequestChangeBoard,
  onRequestChangeAccount,
  deadline,
  integrationsReadOnly = false,
}: Props) {
  const data = useTrelloSummaryData(view, sectionConfig, deadline);

  return (
    <div className="stack">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        <SummaryCardsBlock counts={data.counts} />
        <SummaryCardsByStatusChart counts={data.counts} />
        <SummaryVelocityBlock velocity={data.velocity} />
      </div>

      <SummaryCumulativeChart
        chartData={data.chartData}
        dateRangeSubtitle={data.dateRangeSubtitle}
        xAxisDomain={data.xAxisDomain}
        deadlineStart={data.deadlineStart}
        deadlineEnd={data.deadlineEnd}
        projectStartTime={data.projectStartTime}
        projectEndTime={data.projectEndTime}
      />

      <SummarySettings
        projectId={projectId}
        onRequestChangeBoard={onRequestChangeBoard}
        onRequestChangeAccount={onRequestChangeAccount}
        boardUrl={data.boardUrl}
        integrationsReadOnly={integrationsReadOnly}
      />
    </div>
  );
}
