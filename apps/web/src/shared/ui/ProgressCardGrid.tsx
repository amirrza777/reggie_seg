/* Displays multiple progress cards in a responsive grid */

import { ProgressCard, type ProgressCardData } from "./ProgressCard";

type ProgressCardGridProps = {
  items: ProgressCardData[];
  getHref?: (item: ProgressCardData) => string;
  showLabel?: boolean;
};

export function ProgressCardGrid({ items, getHref, showLabel = true }: ProgressCardGridProps) {
  return (
    <div className="card-grid">
      {items.map((item) => (
        <ProgressCard
          key={item.id}
          data={item}
          href={getHref?.(item)}
          showLabel={showLabel}
        />
      ))}
    </div>
  );
}

export type { ProgressCardData };
