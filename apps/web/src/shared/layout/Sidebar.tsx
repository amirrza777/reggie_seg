import Link from "next/link";
import type { ReactNode } from "react";

type SidebarLink = { href: string; label: string };

type SidebarProps = {
  title?: string;
  links: SidebarLink[];
  footer?: ReactNode;
};

export function Sidebar({ title = "Navigation", links, footer }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__dot" />
        <div>
          <p className="eyebrow">Team Feedback</p>
          <strong>{title}</strong>
        </div>
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="sidebar__link">
            {link.label}
          </Link>
        ))}
      </nav>

      {footer ? <div className="sidebar__footer">{footer}</div> : null}
    </div>
  );
}
