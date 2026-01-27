"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const navLinks = [
  { href: "/", label: "Product" },
  { href: "/?section=features", label: "Features" },
  { href: "/?section=resources", label: "Resources" },
  { href: "/?section=about", label: "About" },
  { href: "/?section=faq", label: "FAQ" },
];

const useHeaderVisibility = () => {
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

  return hidden;
};

const useHomeNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (pathname === "/") {
      window.location.href = "/";
      return;
    }
    router.push("/");
  };
};

const HeaderNav = () => (
  <nav className="nav">
    {navLinks.map((link) => (
      <Link key={link.href} href={link.href} className="nav__link">
        {link.label}
      </Link>
    ))}
  </nav>
);

const HeaderActions = () => (
  <div className="header__cta">
    <Link href="/login" className="link-ghost">
      Log in
    </Link>
    <Link href="/register" className="btn btn--primary">
      Try free
    </Link>
  </div>
);

export function Header() {
  const hidden = useHeaderVisibility();
  const handleLogoClick = useHomeNavigation();

  return (
    <header className={`header${hidden ? " header--hidden" : ""}`}>
      <div className="header__inner">
        <Link href="/" className="logo" aria-label="Back to landing" onClick={handleLogoClick}>
          Team Feedback
        </Link>
        <HeaderNav />
        <HeaderActions />
      </div>
    </header>
  );
}
