"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

type SidebarLink = { href: string; label: string };

type SidebarProps = {
  title?: string;
  links: SidebarLink[];
  footer?: ReactNode;
};

export function Sidebar({ title = "Navigation", links, footer }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const current = useMemo(() => {
    return links.find((link) => pathname?.startsWith(link.href)) ?? links[0];
  }, [links, pathname]);

  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__dot" />
        <div>
          <p className="eyebrow">Team Feedback</p>
          <strong>{title}</strong>
        </div>
      </div>

      <div className="sidebar__mobile">
        <button
          type="button"
          className="sidebar__mobile-trigger"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls="sidebar-mobile-menu"
        >
          <span>{current?.label}</span>
          <span className={`sidebar__chevron ${isOpen ? "is-open" : ""}`}>▾</span>
        </button>

        {isOpen ? (
          <div className="sidebar__mobile-overlay" role="dialog" aria-modal="true" onClick={close}>
            <div
              className="sidebar__mobile-sheet"
              id="sidebar-mobile-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sidebar__mobile-header">
                <p className="eyebrow">{title}</p>
                <button type="button" className="sidebar__mobile-close" onClick={close} aria-label="Close menu">
                  ✕
                </button>
              </div>
              <nav className="sidebar__mobile-nav">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`sidebar__mobile-link ${pathname?.startsWith(link.href) ? "is-active" : ""}`}
                    onClick={close}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        ) : null}
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar__link ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {footer ? <div className="sidebar__footer">{footer}</div> : null}
    </div>
  );
}
