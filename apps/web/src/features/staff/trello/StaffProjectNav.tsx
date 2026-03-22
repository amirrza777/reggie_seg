import Link from "next/link";

type Props = {
  projectId: string;
};

export function StaffProjectNav({ projectId }: Props) {
  const base = `/staff/projects/${projectId}`;
  return (
    <nav className="pill-nav">
      <Link href={base} className="pill-nav__link">
        Overview
      </Link>
      <Link href={`${base}/trello`} className="pill-nav__link">
        Trello
      </Link>
    </nav>
  );
}
