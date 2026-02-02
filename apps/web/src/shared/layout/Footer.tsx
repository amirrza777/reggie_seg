import Link from "next/link";

type FooterLink = { href: string; label: string };

const columns = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Peer assessment" },
      { href: "/", label: "Questionnaires" },
      { href: "/?section=meetings", label: "Meetings" },
      { href: "/?section=integrations", label: "Integrations" },
      { href: "/?section=roles", label: "Roles and permissions" },
      { href: "/?section=analytics", label: "Analytics" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/?section=resources", label: "Guides" },
      { href: "/?section=resources", label: "Templates" },
      { href: "/?section=faq", label: "FAQ" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { href: "/?section=integrations", label: "GitHub" },
      { href: "/?section=integrations", label: "Trello" },
      { href: "/?section=integrations", label: "VLE (placeholder)" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/login", label: "Login" },
      { href: "/status", label: "Status page" },
    ],
  },
];

const FooterBrand = () => (
  <div className="footer__brand">
    <div className="logo">Team Feedback</div>
    <p className="muted">Run peer assessment cycles, meetings, and monitoring from one place.</p>
  </div>
);

const FooterLinkItem = ({ link }: { link: FooterLink }) => (
  <Link href={link.href} className="footer__link">
    {link.label}
  </Link>
);

const FooterColumn = ({ title, links }: { title: string; links: FooterLink[] }) => (
  <div className="footer__col">
    <p className="footer__title">{title}</p>
    <div className="footer__links">
      {links.map((link) => (
        <FooterLinkItem key={`${link.href}-${link.label}`} link={link} />
      ))}
    </div>
  </div>
);

const FooterMeta = () => (
  <div className="footer__meta">
    <span>© {new Date().getFullYear()} Team Feedback</span>
    <div className="footer__meta-links">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/cookies">Cookies</Link>
    </div>
  </div>
);

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <FooterBrand />
        <div className="footer__grid">
          {columns.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links} />
          ))}
        </div>
      </div>
      <FooterMeta />
    </footer>
  );
}
