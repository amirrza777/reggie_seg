"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AnchorLink } from "@/shared/ui/AnchorLink";

const navLinks = [
  { href: "#product", label: "Product" },
  { href: "#toolkit", label: "Features" },
  { href: "#resources", label: "Resources" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (pathname === "/") {
      window.location.href = "/";
      return;
    }
    router.push("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;
      const isScrollingDown = delta > 6;
      const isScrollingUp = delta < -6;

      if (current < 40 || isScrollingUp) {
        setHidden(false);
      } else if (isScrollingDown) {
        setHidden(true);
      }

      lastScrollY.current = current;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`header${hidden ? " header--hidden" : ""}`}>
      <div className="header__inner">
        <Link href="/" className="logo" aria-label="Back to landing" onClick={handleLogoClick}>
          Team Feedback
        </Link>
        <nav className="nav">
          {navLinks.map((link) => (
            <AnchorLink key={link.href} href={link.href} className="nav__link">
              {link.label}
            </AnchorLink>
          ))}
        </nav>
        <div className="header__cta">
          <Link href="/login" className="link-ghost">
            Log in
          </Link>
          <AnchorLink href="#cta" className="btn btn--primary">
            Try free
          </AnchorLink>
        </div>
      </div>
    </header>
  );
}
