/* Card Component that shows a title & progress bar. Can link to another page */

import Link from "next/link";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";

export type ProgressCardData = {
  id: string;
  title: string;
  progress: number; // 0-100
};

type ProgressCardProps = {
  data: ProgressCardData;
  href?: string;
  showLabel?: boolean;
};

export function ProgressCard({ data, href, showLabel = true }: ProgressCardProps) {
  const content = (
    <Card title={data.title}>
      <div className="module-card__progress">
        <ProgressBar value={data.progress} />
        {showLabel && <span className="muted">{data.progress}% complete</span>}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
}
