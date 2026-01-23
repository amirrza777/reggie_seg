"use client";

import { useEffect } from "react";

type ScrollRevealProps = {
  selector?: string;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
};

export function ScrollReveal({
  selector = "[data-reveal]",
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.2,
  once = true,
}: ScrollRevealProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debug = params.has("revealDebug");
    const root = document.documentElement;
    root.classList.add("reveal-ready");

    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!elements.length) {
      root.classList.remove("reveal-ready");
      return;
    }

    const pending = new Set(elements);
    const markVisible = (element: HTMLElement) => element.classList.add("is-visible");
    const markHidden = (element: HTMLElement) => element.classList.remove("is-visible");

    const parseMargin = (value: string) => {
      const parts = value.trim().split(/\s+/);
      const bottom = parts.length >= 3 ? parts[2] : "0px";
      const match = bottom.match(/^(-?\d*\.?\d+)(px|%)?$/);
      if (!match) {
        return { value: 0, unit: "px" };
      }
      return { value: Number.parseFloat(match[1]), unit: match[2] ?? "px" };
    };

    const rootMarginBottom = parseMargin(rootMargin);

    const checkInView = () => {
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      const bottomOffset =
        rootMarginBottom.unit === "%"
          ? (rootMarginBottom.value / 100) * viewHeight
          : rootMarginBottom.value;
      pending.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const thresholdPx = rect.height * threshold;
        const isInView =
          rect.top < viewHeight + bottomOffset - thresholdPx && rect.bottom > thresholdPx;
        if (isInView) {
          markVisible(element);
          if (once) {
            pending.delete(element);
          }
        } else if (!once) {
          markHidden(element);
        }
      });
    };

    let ticking = false;
    const scheduleCheck = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          checkInView();
          ticking = false;
        });
      }
    };

    let debugNode: HTMLDivElement | null = null;
    const updateDebug = () => {
      if (!debug || !debugNode) {
        return;
      }
      const visibleCount = elements.filter((element) => element.classList.contains("is-visible")).length;
      debugNode.textContent = [
        "ScrollReveal",
        `elements: ${elements.length}`,
        `visible: ${visibleCount}`,
        `scrollY: ${Math.round(window.scrollY)}`,
      ].join(" | ");
    };

    // Double rAF to ensure hidden styles paint, then animate above-the-fold items on mount.
    requestAnimationFrame(() => requestAnimationFrame(checkInView));
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);
    window.addEventListener("scroll", updateDebug, { passive: true });
    window.addEventListener("resize", updateDebug);

    if (debug) {
      debugNode = document.createElement("div");
      debugNode.style.position = "fixed";
      debugNode.style.bottom = "16px";
      debugNode.style.left = "16px";
      debugNode.style.zIndex = "9999";
      debugNode.style.padding = "8px 12px";
      debugNode.style.borderRadius = "999px";
      debugNode.style.background = "rgba(15, 23, 42, 0.9)";
      debugNode.style.color = "#f8fafc";
      debugNode.style.fontSize = "12px";
      debugNode.style.fontFamily = "SF Pro Display, system-ui, sans-serif";
      debugNode.style.letterSpacing = "0.01em";
      document.body.appendChild(debugNode);
      updateDebug();
    }

    return () => {
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
      window.removeEventListener("scroll", updateDebug);
      window.removeEventListener("resize", updateDebug);
      if (debugNode) {
        debugNode.remove();
        debugNode = null;
      }
      root.classList.remove("reveal-ready");
    };
  }, [once, rootMargin, selector, threshold]);

  return null;
}
