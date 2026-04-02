"use client";

import { XAxis } from "recharts";
import { formatDate } from "@/shared/lib/formatDate";

type TrelloTimeXAxisProps = {
  domain: [number, number] | undefined;
  scale?: "linear";
};

export function formatTrelloTimeTick(value: number) {
  return formatDate(new Date(value).toISOString().slice(0, 10));
}

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
