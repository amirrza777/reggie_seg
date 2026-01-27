import type { ProgressCardData } from "./ProgressCard";
import { ProgressCard } from "./ProgressCard";

type ProgressCardGridProps = {
  items: ProgressCardData[];
  getHref?: (item: ProgressCardData) => string;
};

export function ProgressCardGrid({ items, getHref }: ProgressCardGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        width: "100%",
      }}
    >
      {items.map((item) => (
        <ProgressCard key={item.id} {...item} href={getHref ? getHref(item) : undefined} />
      ))}
    </div>
  );
}
