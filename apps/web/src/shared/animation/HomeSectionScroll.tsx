"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const HEADER_SCROLL_OFFSET = 12;
const MAX_SCROLL_ATTEMPTS = 20;

const scrollToSection = (id: string) => {
  const target = document.getElementById(id);
  if (!target) return false;

  const header = document.querySelector<HTMLElement>(".header");
  const headerOffset = (header?.getBoundingClientRect().height ?? 0) + HEADER_SCROLL_OFFSET;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  return true;
};

const sectionFromAnchor = (anchor: HTMLAnchorElement) => {
  const href = anchor.getAttribute("href");
  if (!href) return null;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname !== "/") return null;
  return url.searchParams.get("section");
};

export function HomeSectionScroll() {
  const pathname = usePathname();
  const section = useSearchParams().get("section");
  const rafIdRef = useRef<number | null>(null);

  const scheduleScroll = (nextSection: string) => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
    }

    let attempts = 0;

    const tick = () => {
      if (scrollToSection(nextSection)) {
        rafIdRef.current = null;
        return;
      }

      attempts += 1;
      if (attempts < MAX_SCROLL_ATTEMPTS) {
        rafIdRef.current = window.requestAnimationFrame(tick);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (pathname !== "/") return;
    if (!section) return;

    scheduleScroll(section);

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [pathname, section]);

  useEffect(() => {
    if (pathname !== "/") return;

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const clickedSection = sectionFromAnchor(anchor);
      if (!clickedSection) return;

      event.preventDefault();
      event.stopPropagation();
      scheduleScroll(clickedSection);
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pathname]);

  return null;
}
