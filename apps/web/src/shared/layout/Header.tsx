"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { BrandWordmark } from "./BrandWordmark";

const navLinks = [
  { href: "/product", label: "Product" },
  { href: "/features", label: "Features" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

const subscribe = () => () => {};

const useIsHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

type HeaderVisibilityState = {
  hidden: boolean;
  lastScrollY: number;
  downwardTravel: number;
  upwardTravel: number;
  frameId: number | null;
};

function createHeaderVisibilityState(): HeaderVisibilityState {
  return {
    hidden: false,
    lastScrollY: 0,
    downwardTravel: 0,
    upwardTravel: 0,
    frameId: null,
  };
}

function resetHeaderTravel(state: HeaderVisibilityState) {
  state.downwardTravel = 0;
  state.upwardTravel = 0;
}

function applyHeaderVisibilityUpdate(state: HeaderVisibilityState): boolean | null {
  const current = Math.max(window.scrollY, 0);
  const delta = current - state.lastScrollY;

  if (delta > 0) {
    state.downwardTravel += delta;
    state.upwardTravel = 0;
  } else if (delta < 0) {
    state.upwardTravel += -delta;
    state.downwardTravel = 0;
  }

  let nextHidden = state.hidden;
  if (current < 40) {
    nextHidden = false;
    resetHeaderTravel(state);
  } else if (!state.hidden && state.downwardTravel >= 18) {
    nextHidden = true;
    resetHeaderTravel(state);
  } else if (state.hidden && state.upwardTravel >= 10) {
    nextHidden = false;
    resetHeaderTravel(state);
  }

  state.lastScrollY = current;
  if (nextHidden === state.hidden) {
    return null;
  }

  state.hidden = nextHidden;
  return nextHidden;
}

function queueHeaderVisibilityUpdate(state: HeaderVisibilityState, setHidden: (hidden: boolean) => void) {
  if (state.frameId !== null) {
    return;
  }

  state.frameId = window.requestAnimationFrame(() => {
    state.frameId = null;
    const nextHidden = applyHeaderVisibilityUpdate(state);
    if (nextHidden !== null) {
      setHidden(nextHidden);
    }
  });
}

function useHeaderVisibilityEffect(stateRef: { current: HeaderVisibilityState }, setHidden: (hidden: boolean) => void) {
  useEffect(() => {
    const state = stateRef.current;
    const handleScroll = () => {
      queueHeaderVisibilityUpdate(state, setHidden);
    };

    state.lastScrollY = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (state.frameId !== null) {
        window.cancelAnimationFrame(state.frameId);
      }
    };
  }, [setHidden, stateRef]);
}

const useHeaderVisibility = () => {
  const [hidden, setHidden] = useState(false);
  const visibilityStateRef = useRef<HeaderVisibilityState>(createHeaderVisibilityState());
  useHeaderVisibilityEffect(visibilityStateRef, setHidden);
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
  if (!isMounted) {
    return null;
  }

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
  const closeMenu = () => setIsMenuOpen(false);

  useCloseMenuOnResizeAndEscape(closeMenu);
  useBodyScrollLock(isMenuOpen);

  return {
    isMenuOpen,
    isMounted,
    closeMenu,
    toggleMenu: () => setIsMenuOpen((open) => !open),
  };
}

function useCloseMenuOnResizeAndEscape(closeMenu: () => void) {
  useEffect(() => {
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
  }, [closeMenu]);
}

function useBodyScrollLock(isMenuOpen: boolean) {
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);
}
