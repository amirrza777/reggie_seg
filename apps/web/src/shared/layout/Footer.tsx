import Link from "next/link";
import { AnchorLink } from "@/shared/ui/AnchorLink";

type FooterLink = { href: string; label: string };

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

const FooterBrand = () => (
  <div className="footer__brand">
    <div className="logo">Team Feedback</div>
    <p className="muted">Run peer assessment cycles, meetings, and monitoring from one place.</p>
  </div>
);

const FooterLinkItem = ({ link }: { link: FooterLink }) =>
  link.href.startsWith("#") ? (
    <AnchorLink href={link.href} className="footer__link">
      {link.label}
    </AnchorLink>
  ) : (
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
      <AnchorLink href="#privacy">Privacy</AnchorLink>
      <AnchorLink href="#terms">Terms</AnchorLink>
      <AnchorLink href="#cookies">Cookies</AnchorLink>
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
