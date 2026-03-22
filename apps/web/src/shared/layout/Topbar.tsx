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
  return (
    <div className="topbar">
      {leading ? <div className="topbar__leading">{leading}</div> : null}
      <div className="topbar__main">
        {title ? (
          <h1 className="topbar__title">
            {titleHref ? (
              <Link href={titleHref} className="topbar__title-link">
                {title}
              </Link>
            ) : (
              title
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
