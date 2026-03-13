"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  projectId: string;
  boardName: string;
  boardUrl?: string;
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
      className={`btn btn--ghost ${active ? "nav-link--active" : "nav-link--inactive"}`}
    >
      {children}
    </Link>
  );
}

export function StaffTrelloNav({ projectId, boardName, boardUrl }: Props) {
  const pathname = usePathname();
  const base = `/staff/projects/${projectId}/trello`;
  const isSummary = pathname === base || pathname === `${base}/`;
  const isBoard = pathname === `${base}/board`;
  const isGraphs = pathname === `${base}/graphs`;

  return (
    <header className="stack">
      <div>
        <h1>Trello</h1>
        <p className="eyebrow ">
          {boardUrl ? (
            <Link href={boardUrl} target="_blank" rel="noopener noreferrer">{boardName} ⤴</Link>
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
