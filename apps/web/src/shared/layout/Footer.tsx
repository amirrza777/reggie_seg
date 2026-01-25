import Link from "next/link";
import { AnchorLink } from "@/shared/ui/AnchorLink";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#product", label: "Peer assessment" },
      { href: "#product", label: "Questionnaires" },
      { href: "#toolkit", label: "Meetings" },
      { href: "#integrations", label: "Integrations" },
      { href: "#toolkit", label: "Roles and permissions" },
      { href: "#health", label: "Analytics" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "#resources", label: "Guides" },
      { href: "#resources", label: "Templates" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { href: "#integrations", label: "GitHub" },
      { href: "#integrations", label: "Trello" },
      { href: "#integrations", label: "VLE (placeholder)" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#privacy", label: "Privacy" },
      { href: "#terms", label: "Terms" },
      { href: "#cookies", label: "Cookies" },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/login", label: "Login" },
      { href: "#status", label: "Status page" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="logo">Team Feedback</div>
          <p className="muted">Run peer assessment cycles, meetings, and monitoring from one place.</p>
        </div>
        <div className="footer__grid">
          {columns.map((col) => (
            <div key={col.title} className="footer__col">
              <p className="footer__title">{col.title}</p>
              <div className="footer__links">
                {col.links.map((link) => {
                  const key = `${link.href}-${link.label}`;
                  if (link.href.startsWith("#")) {
                    return (
                      <AnchorLink key={key} href={link.href} className="footer__link">
                        {link.label}
                      </AnchorLink>
                    );
                  }
                  return (
                    <Link key={key} href={link.href} className="footer__link">
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="footer__meta">
        <span>© {new Date().getFullYear()} Team Feedback</span>
        <div className="footer__meta-links">
          <AnchorLink href="#privacy">Privacy</AnchorLink>
          <AnchorLink href="#terms">Terms</AnchorLink>
          <AnchorLink href="#cookies">Cookies</AnchorLink>
        </div>
      </div>
    </footer>
  );
}
