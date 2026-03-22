"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  projectId: string;
  boardName: string;
  boardUrl: string;
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

export function TrelloNav({ projectId, boardName, boardUrl }: Props) {
  const pathname = usePathname();
  const base = `/projects/${projectId}/trello`;
  const isSummary = pathname === base || pathname === `${base}/`;
  const isBoard = pathname === `${base}/board`;
  const isGraphs = pathname === `${base}/graphs`;

  return (
    <header className="stack">
      <div className="projects-panel__header">
        <h1 className="projects-panel__title">Trello</h1>
        <p className="projects-panel__subtitle">
          <Link href={boardUrl} target="_blank" rel="noreferrer">
            {boardName} ⤴
          </Link>
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
