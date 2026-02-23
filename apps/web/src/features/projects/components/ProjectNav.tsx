import Link from "next/link";

type ProjectNavProps = {
  projectId: string;
};

export function ProjectNav({ projectId }: ProjectNavProps) {
  const base = `/projects/${projectId}`;
  const links = [
    { href: base, label: "Overview" },
    { href: `${base}/team`, label: "Team" },
    { href: `${base}/meetings`, label: "Meetings" },
    { href: `${base}/peer-assessments`, label: "Peer assessment" },
    { href: `${base}/peer-feedback`, label: "Peer feedback" },
    { href: `${base}/repos`, label: "Repos" },
    { href: `${base}/trello`, label: "Trello" },
  ];

  return (
    <nav className="pill-nav">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="pill-nav__link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
