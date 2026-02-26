import Link from "next/link";

type ProjectNavProps = {
  projectId: string;
  enabledFlags?: Record<string, boolean>;
};

export function ProjectNav({ projectId, enabledFlags }: ProjectNavProps) {
  const base = `/projects/${projectId}`;
  const links = [
    { href: base, label: "Overview" },
    { href: `${base}/team`, label: "Team" },
    { href: `${base}/meetings`, label: "Meetings" },
    { href: `${base}/peer-assessments`, label: "Peer assessment" }, // always visible
    { href: `${base}/peer-feedback`, label: "Peer feedback", flag: "peer_feedback" },
    { href: `${base}/repos`, label: "Repos", flag: "repos" },
  ].filter((link) => {
    if (link.flag && enabledFlags) {
      return enabledFlags[link.flag] === true;
    }
    return true;
  });

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
