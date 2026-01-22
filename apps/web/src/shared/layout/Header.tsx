"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  { href: "#product", label: "Product" },
  { href: "#toolkit", label: "Features" },
  { href: "#resources", label: "Resources" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

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
        <div className="logo">Team Feedback</div>
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
            Try free
          </Link>
        </div>
      </div>
    </header>
  );
}
