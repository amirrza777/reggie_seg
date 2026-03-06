"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

export type SidebarLink = {
  href: string;
  label: string;
  space?: "workspace" | "staff" | "enterprise" | "admin";
  flag?: string;
  children?: Array<{ href: string; label: string; flag?: string }>;
  defaultExpanded?: boolean;
};

type SidebarProps = {
  title?: string;
  links: SidebarLink[];
  footer?: ReactNode;
};

function normalizePath(path: string) {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "");
}

function isHrefActive(
  href: string,
  pathname: string | null,
  searchParams: Pick<URLSearchParams, "get"> | null
) {
  if (!pathname) return false;

  const [rawPath, rawQuery] = href.split("?");
  const targetPath = normalizePath(rawPath);
  const currentPath = normalizePath(pathname);

  const pathMatches =
    targetPath === "/"
      ? currentPath === "/"
      : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

  if (!pathMatches) return false;
  if (!rawQuery) return true;
  if (!searchParams) return false;

  const requiredParams = new URLSearchParams(rawQuery);
  for (const [key, value] of requiredParams.entries()) {
    if (searchParams.get(key) !== value) return false;
  }

  return true;
}

export function Sidebar({ title = "Navigation", links, footer }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const activeLink = useMemo(() => {
    if (!pathname) return undefined;
    const matching = links.filter((link) => isHrefActive(link.href, pathname, searchParams));
    return matching.sort((a, b) => b.href.length - a.href.length)[0];
  }, [links, pathname, searchParams]);

  const currentSpace: SidebarLink["space"] = useMemo(() => {
    if (activeLink?.space) return activeLink.space;
    if (!pathname) return "workspace";
    if (pathname.startsWith("/enterprise")) return "enterprise";
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/staff")) return "staff";
    return "workspace";
  }, [pathname, activeLink]);

  const visibleLinks = useMemo(() => {
    return links.filter((link) => !link.space || link.space === currentSpace);
  }, [links, currentSpace]);

  const current = useMemo(() => {
    const visibleTargets = visibleLinks.flatMap((link) => [link, ...(link.children ?? [])]);
    if (!pathname) return visibleTargets[0];
    const matching = visibleTargets.filter((link) => isHrefActive(link.href, pathname, searchParams));
    return matching.sort((a, b) => b.href.length - a.href.length)[0] ?? visibleTargets[0];
  }, [visibleLinks, pathname, searchParams]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (const link of visibleLinks) {
        if (!link.children || link.children.length === 0) continue;
        const childActive = link.children.some((child) => isHrefActive(child.href, pathname, searchParams));
        const parentActive = isHrefActive(link.href, pathname, searchParams);
        const isActiveGroup = parentActive || childActive;
        next[link.href] = prev[link.href] ?? link.defaultExpanded ?? isActiveGroup;
        if (isActiveGroup) next[link.href] = true;
      }
      return next;
    });
  }, [visibleLinks, pathname, searchParams]);

  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);
  const toggleGroup = (href: string) =>
    setExpandedGroups((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));

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
                {visibleLinks.map((link) => {
                  const hasChildren = Boolean(link.children && link.children.length > 0);
                  const isParentActive = isHrefActive(link.href, pathname, searchParams);
                  if (!hasChildren) {
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`sidebar__mobile-link ${isParentActive ? "is-active" : ""}`}
                        onClick={close}
                      >
                        {link.label}
                      </Link>
                    );
                  }

                  const groupOpen = expandedGroups[link.href] ?? false;
                  const childActive = (link.children ?? []).some((child) =>
                    isHrefActive(child.href, pathname, searchParams)
                  );
                  const groupActive = isParentActive || childActive;

                  return (
                    <div className="sidebar__mobile-group" key={link.href}>
                      <button
                        type="button"
                        className={`sidebar__mobile-group-trigger ${groupActive ? "is-active" : ""}`}
                        onClick={() => toggleGroup(link.href)}
                        aria-expanded={groupOpen}
                      >
                        <span>{link.label}</span>
                        <span className={`sidebar__chevron ${groupOpen ? "is-open" : ""}`}>▾</span>
                      </button>
                      {groupOpen ? (
                        <div className="sidebar__mobile-group-items">
                          {(link.children ?? []).map((child) => {
                            const isChildActive = isHrefActive(child.href, pathname, searchParams);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`sidebar__mobile-sublink ${isChildActive ? "is-active" : ""}`}
                                onClick={close}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        ) : null}
      </div>

      <nav className="sidebar__nav">
        {visibleLinks.map((link) => {
          const hasChildren = Boolean(link.children && link.children.length > 0);
          const isParentActive = isHrefActive(link.href, pathname, searchParams);
          if (!hasChildren) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar__link ${isParentActive ? "is-active" : ""}`}
                aria-current={isParentActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          }

          const groupOpen = expandedGroups[link.href] ?? false;
          const childActive = (link.children ?? []).some((child) =>
            isHrefActive(child.href, pathname, searchParams)
          );
          const groupActive = isParentActive || childActive;

          return (
            <div className="sidebar__group" key={link.href}>
              <button
                type="button"
                className={`sidebar__group-trigger ${groupActive ? "is-active" : ""}`}
                onClick={() => toggleGroup(link.href)}
                aria-expanded={groupOpen}
              >
                <span>{link.label}</span>
                <span className={`sidebar__chevron ${groupOpen ? "is-open" : ""}`}>▾</span>
              </button>
              {groupOpen ? (
                <div className="sidebar__group-items">
                  {(link.children ?? []).map((child) => {
                    const isChildActive = isHrefActive(child.href, pathname, searchParams);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`sidebar__sublink ${isChildActive ? "is-active" : ""}`}
                        aria-current={isChildActive ? "page" : undefined}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {footer ? <div className="sidebar__footer">{footer}</div> : null}
    </div>
  );
}
