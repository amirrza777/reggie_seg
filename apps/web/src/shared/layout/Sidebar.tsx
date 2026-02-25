"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

type SidebarLink = { href: string; label: string; space?: "workspace" | "staff" | "admin" };

type SidebarProps = {
  title?: string;
  links: SidebarLink[];
  footer?: ReactNode;
};

export function Sidebar({ title = "Navigation", links, footer }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const activeLink = useMemo(() => {
    if (!pathname) return undefined;
    const matching = links.filter((link) => pathname.startsWith(link.href));
    return matching.sort((a, b) => b.href.length - a.href.length)[0];
  }, [links, pathname]);

  const currentSpace: SidebarLink["space"] = useMemo(() => {
    if (activeLink?.space) return activeLink.space;
    if (!pathname) return "workspace";
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/staff")) return "staff";
    return "workspace";
  }, [pathname, activeLink]);

  const visibleLinks = useMemo(() => {
    return links.filter((link) => !link.space || link.space === currentSpace);
  }, [links, currentSpace]);

  const current = useMemo(() => {
    if (!pathname) return visibleLinks[0];
    const matching = visibleLinks.filter((link) => pathname.startsWith(link.href));
    return matching.sort((a, b) => b.href.length - a.href.length)[0] ?? visibleLinks[0];
  }, [visibleLinks, pathname]);

  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <div className="sidebar">
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
                {visibleLinks.map((link) => (
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
        {visibleLinks.map((link) => {
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
