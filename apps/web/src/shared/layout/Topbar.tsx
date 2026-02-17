import Link from "next/link";
import type { ReactNode } from "react";

type TopbarProps = {
  title?: string;
  titleHref?: string;
  nav?: ReactNode;
  actions?: ReactNode;
};

export function Topbar({ title, titleHref, nav, actions }: TopbarProps) {
  return (
    <div className="topbar">
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
      {actions ? <div className="topbar__actions">{actions}</div> : null}
    </div>
  );
}
