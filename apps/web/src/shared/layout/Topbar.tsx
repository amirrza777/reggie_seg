import Link from "next/link";
import type { ReactNode } from "react";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

type TopbarProps = {
  leading?: ReactNode;
  title?: string;
  titleHref?: string;
  nav?: ReactNode;
  actions?: ReactNode;
};

export function Topbar({ leading, title, titleHref, nav, actions }: TopbarProps) {
  const isBrandTitle = title === "Team Feedback";
  const titleContent =
    isBrandTitle ? (
      <span className="topbar__title-brand">
        <img src="/favicon-32x32.png" alt="" aria-hidden="true" className="topbar__title-icon" />
        <span className="topbar__title-text">{title}</span>
      </span>
    ) : (
      title
    );

  return (
    <div className="topbar">
      {leading ? <div className="topbar__leading">{leading}</div> : null}
      <div className="topbar__main">
        {title ? (
          <h1 className="topbar__title" aria-label={isBrandTitle ? title : undefined}>
            {titleHref ? (
              <Link href={titleHref} className="topbar__title-link" aria-label={isBrandTitle ? title : undefined}>
                {titleContent}
              </Link>
            ) : (
              titleContent
            )}
          </h1>
        ) : null}
        {nav ? <div className="topbar__nav">{nav}</div> : null}
      </div>
      <div className="topbar__actions">
        <NotificationBell />
        {actions}
      </div>
    </div>
  );
}
