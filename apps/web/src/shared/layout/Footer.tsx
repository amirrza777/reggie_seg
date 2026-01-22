import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#how-it-works", label: "How it works" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "#faq", label: "FAQ" },
      { href: "#support", label: "Support" },
      { href: "#blog", label: "Blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#about", label: "About" },
      { href: "#careers", label: "Careers" },
      { href: "#contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="logo">Reggie</div>
          <p className="muted">Planning that fits the way you think.</p>
        </div>
        <div className="footer__grid">
          {columns.map((col) => (
            <div key={col.title} className="footer__col">
              <p className="footer__title">{col.title}</p>
              <div className="footer__links">
                {col.links.map((link) => (
                  <Link key={link.href} href={link.href} className="footer__link">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="footer__meta">
        <span>© {new Date().getFullYear()} Reggie</span>
        <div className="footer__meta-links">
          <Link href="#privacy">Privacy</Link>
          <Link href="#terms">Terms</Link>
          <Link href="#cookies">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
