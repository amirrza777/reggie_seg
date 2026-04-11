// Shared Recharts XAxis configured for Trello time-based charts.

"use client";

import { XAxis } from "recharts";
import { formatTrelloTimeTick } from "./trelloTimeTick";

export { formatTrelloTimeTick };

type TrelloTimeXAxisProps = {
  domain: [number, number] | undefined;
  scale?: "linear";
};

export function TrelloTimeXAxis({ domain, scale }: TrelloTimeXAxisProps) {
  return (
    <XAxis
      type="number"
      dataKey="time"
      domain={domain}
      scale={scale}
      tickFormatter={formatTrelloTimeTick}
      padding={{ left: 24, right: 24 }}
    />
  );
}
