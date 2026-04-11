// Sub-nav for Trello tabs (summary / board / graphs). Staff and students (just different base path)

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TrelloNavProps = {
  /** e.g. `/projects/${projectId}/trello` or `${staffTeamBase}/trello` */
  basePath: string;
  boardName: string;
  boardUrl?: string | null;
};

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`pill-nav__link${active ? " pill-nav__link--active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function normalizeBasePath(basePath: string): string {
  return basePath.replace(/\/$/, "") || basePath;
}

export function TrelloNav({ basePath, boardName, boardUrl }: TrelloNavProps) {
  const pathname = usePathname();
  const base = normalizeBasePath(basePath);
  const isSummary = pathname === base || pathname === `${base}/`;
  const isBoard = pathname === `${base}/board`;
  const isGraphs = pathname === `${base}/graphs`;

  return (
    <header className="stack">
      <div className="projects-panel__header">
        <h1 className="projects-panel__title">Trello</h1>
        <p className="projects-panel__subtitle">
          {boardUrl ? (
            <Link href={boardUrl} target="_blank" rel="noopener noreferrer">
              {boardName} ⤴
            </Link>
          ) : (
            boardName
          )}
        </p>
      </div>
      <nav className="pill-nav" aria-label="Trello sections">
        <NavLink href={base} active={isSummary}>
          Summary
        </NavLink>
        <NavLink href={`${base}/board`} active={isBoard}>
          Board
        </NavLink>
        <NavLink href={`${base}/graphs`} active={isGraphs}>
          Graphs
        </NavLink>
      </nav>
    </header>
  );
}
