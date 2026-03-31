"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { BrandWordmark } from "./BrandWordmark";

const navLinks = [
  { href: "/?section=product", label: "Product" },
  { href: "/?section=toolkit", label: "Features" },
  { href: "/?section=resources", label: "Resources" },
  { href: "/?section=about", label: "About" },
  { href: "/?section=faq", label: "FAQ" },
];

const subscribe = () => () => {};

const useIsHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

const useHeaderVisibility = () => {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hiddenRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const updateVisibility = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;
      const isScrollingDown = delta > 6;
      const isScrollingUp = delta < -6;
      let nextHidden = hiddenRef.current;

      if (current < 40 || isScrollingUp) {
        nextHidden = false;
      } else if (isScrollingDown) {
        nextHidden = true;
      }

      if (nextHidden !== hiddenRef.current) {
        hiddenRef.current = nextHidden;
        setHidden(nextHidden);
      }

      lastScrollY.current = current;
    };

    const handleScroll = () => {
      if (frameIdRef.current !== null) return;
      frameIdRef.current = window.requestAnimationFrame(() => {
        frameIdRef.current = null;
        updateVisibility();
      });
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current);
      }
    };
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

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" role="presentation" aria-hidden className="mobile-menu__close-icon">
    <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function Header() {
  const hidden = useHeaderVisibility();
  const handleLogoClick = useHomeNavigation();
  const mobileMenu = useMobileMenuState();

  return (
    <header className={`header${hidden ? " header--hidden" : ""}`}>
      <HeaderTopBar
        handleLogoClick={handleLogoClick}
        isMenuOpen={mobileMenu.isMenuOpen}
        onToggleMenu={mobileMenu.toggleMenu}
      />
      <HeaderMobileOverlay
        isMounted={mobileMenu.isMounted}
        isMenuOpen={mobileMenu.isMenuOpen}
        handleLogoClick={handleLogoClick}
        onCloseMenu={mobileMenu.closeMenu}
      />
    </header>
  );
}

function HeaderTopBar({
  handleLogoClick,
  isMenuOpen,
  onToggleMenu,
}: {
  handleLogoClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <div className="header__inner">
      <Link href="/" className="logo" aria-label="Back to landing" onClick={handleLogoClick}>
        <BrandWordmark />
      </Link>
      <HeaderNav />
      <HeaderActions />
      <button
        className="header__burger"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={isMenuOpen}
        onClick={onToggleMenu}
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  );
}

function HeaderMobileOverlay({
  isMounted,
  isMenuOpen,
  handleLogoClick,
  onCloseMenu,
}: {
  isMounted: boolean;
  isMenuOpen: boolean;
  handleLogoClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onCloseMenu: () => void;
}) {
  if (!isMounted) return null;

  return createPortal(
    <div className={`mobile-menu${isMenuOpen ? " is-open" : ""}`} aria-hidden={!isMenuOpen}>
      <button className="mobile-menu__scrim" aria-label="Close menu" onClick={onCloseMenu} />
      <div className="mobile-menu__panel" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <MobileMenuTopBar handleLogoClick={handleLogoClick} onCloseMenu={onCloseMenu} />
        <MobileMenuLinks onCloseMenu={onCloseMenu} />
        <MobileMenuActions onCloseMenu={onCloseMenu} />
      </div>
    </div>,
    document.body
  );
}

function MobileMenuTopBar({
  handleLogoClick,
  onCloseMenu,
}: {
  handleLogoClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onCloseMenu: () => void;
}) {
  return (
    <div className="mobile-menu__top">
      <Link href="/" className="logo" aria-label="Back to landing" onClick={handleLogoClick}>
        <BrandWordmark />
      </Link>
      <button className="mobile-menu__close" type="button" aria-label="Close menu" onClick={onCloseMenu}>
        <CloseIcon />
      </button>
    </div>
  );
}

function MobileMenuLinks({ onCloseMenu }: { onCloseMenu: () => void }) {
  return (
    <div className="mobile-menu__sections">
      {navLinks.map((link) => (
        <Link key={link.href} href={link.href} className="mobile-menu__item" onClick={onCloseMenu}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function MobileMenuActions({ onCloseMenu }: { onCloseMenu: () => void }) {
  return (
    <div className="mobile-menu__cta">
      <Link href="/login" className="btn btn--ghost" onClick={onCloseMenu}>
        Log in
      </Link>
      <Link href="/register" className="btn btn--primary" onClick={onCloseMenu}>
        Get started
      </Link>
    </div>
  );
}

function useMobileMenuState() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMounted = useIsHydrated();

  useEffect(() => {
    const closeMenu = () => setIsMenuOpen(false);
    const onResize = () => {
      if (window.innerWidth > 900) {
        closeMenu();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return {
    isMenuOpen,
    isMounted,
    closeMenu: () => setIsMenuOpen(false),
    toggleMenu: () => setIsMenuOpen((open) => !open),
  };
}
