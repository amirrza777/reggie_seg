import type { ReactNode } from "react";
import Link from "next/link";

const navLinks = [
  { href: "/modules", label: "Modules" },
  { href: "/projects/123", label: "Projects" },
  { href: "/admin", label: "Admin" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="sidebar">
          <div className="sidebar__brand">
            <span className="sidebar__dot" />
            <div>
              <p className="eyebrow">Team Feedback</p>
              <strong>Workspace</strong>
            </div>
          </div>

          <nav className="sidebar__nav">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="sidebar__link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="app-shell__content">
        <header className="app-shell__topbar">
          <div className="topbar">
            <h1 className="topbar__title">Team Feedback</h1>
          </div>
        </header>
        <div className="app-shell__body">{children}</div>
      </div>
    </div>
  );
}
