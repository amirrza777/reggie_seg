"use client";

import { useLayoutEffect } from "react";

type ScrollRevealProps = {
  selector?: string;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
};

const REVEAL_ROW_EPSILON = 8;

function compareViewportPosition(
  aTop: number,
  aLeft: number,
  bTop: number,
  bLeft: number
) {
  if (Math.abs(aTop - bTop) > REVEAL_ROW_EPSILON) {
    return aTop - bTop;
  }
  return aLeft - bLeft;
}

function compareRevealElements(a: HTMLElement, b: HTMLElement) {
  const aRect = a.getBoundingClientRect();
  const bRect = b.getBoundingClientRect();
  return compareViewportPosition(aRect.top, aRect.left, bRect.top, bRect.left);
}

function compareRevealEntries(a: IntersectionObserverEntry, b: IntersectionObserverEntry) {
  return compareViewportPosition(
    a.boundingClientRect.top,
    a.boundingClientRect.left,
    b.boundingClientRect.top,
    b.boundingClientRect.left
  );
}

export function ScrollReveal({
  selector = "[data-reveal]",
  rootMargin = "0px 0px -8% 0px",
  threshold = 0.1,
  once = true,
}: ScrollRevealProps) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!elements.length) return;
    const timeoutIds: number[] = [];
    const scheduleReveal = (el: HTMLElement, delay = 16) => {
      const timeoutId = window.setTimeout(() => {
        el.classList.add("is-visible");
      }, delay);
      timeoutIds.push(timeoutId);
    };
    const applyAutoDelay = (el: HTMLElement, index: number, base: number, step: number, cap: number) => {
      const hasInlineDelay = el.style.getPropertyValue("--reveal-delay").trim().length > 0;
      const isAutoDelay = el.dataset.autoRevealDelay === "1";
      if (hasInlineDelay && !isAutoDelay) return;
      if (hasInlineDelay && isAutoDelay) return;
      const staggerDelay = Math.min(cap, base + index * step);
      el.style.setProperty("--reveal-delay", `${staggerDelay}ms`);
      el.dataset.autoRevealDelay = "1";
    };

    // Hide everything first
    root.classList.add("reveal-ready");

    // Force reflow so the browser paints opacity:0 before we reveal
    void document.body.offsetHeight;

    // Single shared observer for below-fold elements
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(compareRevealEntries);

        visibleEntries.forEach((entry, index) => {
          const el = entry.target as HTMLElement;
          applyAutoDelay(el, index, 70, 30, 220);
          scheduleReveal(el);
          if (once) observer.unobserve(el);
        });
      },
      { rootMargin, threshold }
    );

    const groupObservers: IntersectionObserver[] = [];
    let rafId: number | null = window.requestAnimationFrame(() => {
      // Reveal above-fold elements with a short stagger so the initial
      // entrance animation is visible instead of appearing instantly.
      const vh = window.innerHeight;
      const aboveFold: HTMLElement[] = [];
      for (const el of elements) {
        if (el.getBoundingClientRect().top < vh) {
          aboveFold.push(el);
        }
      }

      aboveFold
        .sort(compareRevealElements)
        .forEach((el, index) => {
          applyAutoDelay(el, index, 90, 35, 260);
          scheduleReveal(el, 35);
        });

      const aboveFoldSet = new Set(aboveFold);
      for (const el of elements) {
        if (aboveFoldSet.has(el)) {
          continue;
        }
        if (!el.classList.contains("is-visible")) {
          observer.observe(el);
        }
      }

      // Observe groups — when group enters viewport, reveal all its children.
      const groups = document.querySelectorAll<HTMLElement>("[data-reveal-group]");
      for (const group of groups) {
        const children = Array.from(group.querySelectorAll<HTMLElement>("[data-reveal]"));
        const groupObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              children
                .sort(compareRevealElements)
                .forEach((child, index) => {
                  applyAutoDelay(child, index, 80, 35, 240);
                  scheduleReveal(child);
                });
              for (const child of children) {
                observer.unobserve(child);
              }
              groupObserver.disconnect();
              break;
            }
          },
          { rootMargin, threshold }
        );
        groupObserver.observe(group);
        groupObservers.push(groupObserver);
      }

      rafId = null;
    });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
      for (const el of elements) {
        if (el.dataset.autoRevealDelay === "1") {
          el.style.removeProperty("--reveal-delay");
          delete el.dataset.autoRevealDelay;
        }
      }
      observer.disconnect();
      for (const o of groupObservers) o.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, [once, rootMargin, selector, threshold]);

  return null;
}
