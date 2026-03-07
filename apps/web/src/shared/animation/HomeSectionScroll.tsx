"use client";

import { useEffect } from "react";
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

const clearSectionQuery = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("section");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
};

export function HomeSectionScroll() {
  const pathname = usePathname();
  const section = useSearchParams().get("section");

  useEffect(() => {
    if (pathname !== "/") return;
    if (!section) return;

    let rafId = 0;
    let attempts = 0;

    const tick = () => {
      if (scrollToSection(section)) {
        clearSectionQuery();
        return;
      }
      attempts += 1;
      if (attempts < MAX_SCROLL_ATTEMPTS) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(rafId);
  }, [pathname, section]);

  return null;
}
