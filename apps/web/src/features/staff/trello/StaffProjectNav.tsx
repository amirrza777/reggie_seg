"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveStaffProjectBasePath } from "@/features/staff/projects/components/navBasePath";

type Props = {
  projectId: string;
  moduleId?: string | number | null;
};

export function StaffProjectNav({ projectId, moduleId }: Props) {
  const pathname = usePathname();
  const base = resolveStaffProjectBasePath({ projectId, moduleId, pathname });
  const trelloHref = `${base}/trello`;
  const canonicalProjectPath = `/projects/${encodeURIComponent(projectId)}`;
  const isOverview =
    pathname === base ||
    pathname === `${base}/` ||
    pathname === canonicalProjectPath ||
    pathname === `${canonicalProjectPath}/` ||
    pathname?.endsWith(canonicalProjectPath) === true ||
    pathname?.endsWith(`${canonicalProjectPath}/`) === true;
  const isTrello =
    pathname === trelloHref ||
    pathname?.startsWith(`${trelloHref}/`) === true ||
    pathname?.includes(`${canonicalProjectPath}/trello`) === true;

  return (
    <nav className="pill-nav">
      <Link
        href={base}
        className={`pill-nav__link${isOverview ? " pill-nav__link--active" : ""}`}
        aria-current={isOverview ? "page" : undefined}
      >
        Overview
      </Link>
      <Link
        href={trelloHref}
        className={`pill-nav__link${isTrello ? " pill-nav__link--active" : ""}`}
        aria-current={isTrello ? "page" : undefined}
      >
        Trello
      </Link>
    </nav>
  );
}
