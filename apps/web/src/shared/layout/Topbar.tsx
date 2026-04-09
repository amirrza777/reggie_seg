import Link from "next/link";
import type { ReactNode } from "react";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

const BRAND_MARK_SRC = "/team-feedback-mark-32.png";

type TopbarProps = {
  leading?: ReactNode;
  title?: string;
  titleHref?: string;
  nav?: ReactNode;
  actions?: ReactNode;
};

function buildTopbarTitleContent(title: string, isBrandTitle: boolean): ReactNode {
  if (!isBrandTitle) {
    return title;
  }
  return (
    <span className="topbar__title-brand">
      <img
        src={BRAND_MARK_SRC}
        alt=""
        aria-hidden="true"
        className="topbar__title-icon"
        width="18"
        height="18"
      />
      <span className="topbar__title-text">{title}</span>
    </span>
  );
}

function TopbarTitle({
  title,
  titleHref,
  isBrandTitle,
  titleContent,
}: {
  title?: string;
  titleHref?: string;
  isBrandTitle: boolean;
  titleContent: ReactNode;
}) {
  if (!title) {
    return null;
  }
  return (
    <h1 className="topbar__title" aria-label={isBrandTitle ? title : undefined}>
      {titleHref ? (
        <Link href={titleHref} className="topbar__title-link" aria-label={isBrandTitle ? title : undefined}>
          {titleContent}
        </Link>
      ) : (
        titleContent
      )}
    </h1>
  );
}

export function Topbar({ leading, title, titleHref, nav, actions }: TopbarProps) {
  const isBrandTitle = title === "Team Feedback";
  const titleContent = buildTopbarTitleContent(title ?? "", isBrandTitle);

  return (
    <div className="topbar">
      {leading ? <div className="topbar__leading">{leading}</div> : null}
      <div className="topbar__main">
        <TopbarTitle title={title} titleHref={titleHref} isBrandTitle={isBrandTitle} titleContent={titleContent} />
        {nav ? <div className="topbar__nav">{nav}</div> : null}
      </div>
      <div className="topbar__actions">
        <NotificationBell />
        {actions}
      </div>
    </div>
  );
}
