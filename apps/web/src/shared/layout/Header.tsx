import Link from "next/link";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#awards", label: "Awards" },
  { href: "#pricing", label: "Pricing" },
];

export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="logo">Reggie</div>
        <nav className="nav">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav__link">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header__cta">
          <Link href="/login" className="link-ghost">
            Log in
          </Link>
          <Link href="#cta" className="btn btn--primary">
            Try for free
          </Link>
        </div>
      </div>
    </header>
  );
}
