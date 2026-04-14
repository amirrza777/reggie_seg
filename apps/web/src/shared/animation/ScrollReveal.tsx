"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

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

type RevealTiming = {
  base: number;
  step: number;
  cap: number;
};

type RevealOptions = Required<Pick<ScrollRevealProps, "selector" | "rootMargin" | "threshold" | "once">>;

function scheduleReveal(params: { timeoutIds: number[]; element: HTMLElement; delay?: number }) {
  const timeoutId = window.setTimeout(() => {
    params.element.classList.add("is-visible");
  }, params.delay ?? 16);
  params.timeoutIds.push(timeoutId);
}

function applyAutoDelay(params: { element: HTMLElement; index: number; timing: RevealTiming }) {
  const hasInlineDelay = params.element.style.getPropertyValue("--reveal-delay").trim().length > 0;
  const isAutoDelay = params.element.dataset.autoRevealDelay === "1";
  if (hasInlineDelay) {
    return;
  }
  if (isAutoDelay) {
    return;
  }
  const staggerDelay = Math.min(params.timing.cap, params.timing.base + params.index * params.timing.step);
  params.element.style.setProperty("--reveal-delay", `${staggerDelay}ms`);
  params.element.dataset.autoRevealDelay = "1";
}

function revealElementsWithStagger(params: {
  elements: HTMLElement[];
  timeoutIds: number[];
  timing: RevealTiming;
  delay?: number;
}) {
  params.elements.forEach((element, index) => {
    applyAutoDelay({ element, index, timing: params.timing });
    scheduleReveal({ timeoutIds: params.timeoutIds, element, delay: params.delay });
  });
}

function getAboveFoldElements(elements: HTMLElement[]) {
  const viewportHeight = window.innerHeight;
  return elements.filter((element) => element.getBoundingClientRect().top < viewportHeight).sort(compareRevealElements);
}

function observeRemainingElements(params: {
  elements: HTMLElement[];
  aboveFold: HTMLElement[];
  observer: IntersectionObserver;
}) {
  const aboveFoldSet = new Set(params.aboveFold);
  for (const element of params.elements) {
    if (aboveFoldSet.has(element)) {
      continue;
    }
    if (!element.classList.contains("is-visible")) {
      params.observer.observe(element);
    }
  }
}

function createEntryObserver(params: {
  timeoutIds: number[];
  rootMargin: string;
  threshold: number;
  once: boolean;
}) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries.filter((entry) => entry.isIntersecting).sort(compareRevealEntries);
      visibleEntries.forEach((entry, index) => {
        const element = entry.target as HTMLElement;
        applyAutoDelay({ element, index, timing: { base: 70, step: 30, cap: 220 } });
        scheduleReveal({ timeoutIds: params.timeoutIds, element });
        if (params.once) {
          observer.unobserve(element);
        }
      });
    },
    { rootMargin: params.rootMargin, threshold: params.threshold }
  );
  return observer;
}

function createGroupRevealObserver(params: {
  children: HTMLElement[];
  timeoutIds: number[];
  rootMargin: string;
  threshold: number;
  observer: IntersectionObserver;
}) {
  return new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        revealElementsWithStagger({
          elements: [...params.children].sort(compareRevealElements),
          timeoutIds: params.timeoutIds,
          timing: { base: 80, step: 35, cap: 240 },
        });
        for (const child of params.children) {
          params.observer.unobserve(child);
        }
        break;
      }
    },
    { rootMargin: params.rootMargin, threshold: params.threshold }
  );
}

function observeRevealGroups(params: {
  timeoutIds: number[];
  rootMargin: string;
  threshold: number;
  observer: IntersectionObserver;
  groupObservers: IntersectionObserver[];
}) {
  const groups = document.querySelectorAll<HTMLElement>("[data-reveal-group]");
  for (const group of groups) {
    const children = Array.from(group.querySelectorAll<HTMLElement>("[data-reveal]"));
    const groupObserver = createGroupRevealObserver({
      children,
      timeoutIds: params.timeoutIds,
      rootMargin: params.rootMargin,
      threshold: params.threshold,
      observer: params.observer,
    });
    groupObserver.observe(group);
    params.groupObservers.push(groupObserver);
  }
}

function runInitialRevealPhase(params: {
  elements: HTMLElement[];
  timeoutIds: number[];
  observer: IntersectionObserver;
  groupObservers: IntersectionObserver[];
  rootMargin: string;
  threshold: number;
}) {
  const aboveFold = getAboveFoldElements(params.elements);
  revealElementsWithStagger({
    elements: aboveFold,
    timeoutIds: params.timeoutIds,
    timing: { base: 90, step: 35, cap: 260 },
    delay: 35,
  });
  observeRemainingElements({ elements: params.elements, aboveFold, observer: params.observer });
  observeRevealGroups({
    timeoutIds: params.timeoutIds,
    rootMargin: params.rootMargin,
    threshold: params.threshold,
    observer: params.observer,
    groupObservers: params.groupObservers,
  });
}

function cleanupScrollReveal(params: {
  rafId: number | null;
  timeoutIds: number[];
  elements: HTMLElement[];
  observer: IntersectionObserver;
  groupObservers: IntersectionObserver[];
  root: HTMLElement;
}) {
  if (params.rafId !== null) {
    window.cancelAnimationFrame(params.rafId);
  }
  for (const timeoutId of params.timeoutIds) {
    window.clearTimeout(timeoutId);
  }
  cleanupRevealDelays(params.elements);
  params.observer.disconnect();
  for (const groupObserver of params.groupObservers) {
    groupObserver.disconnect();
  }
  params.root.classList.remove("reveal-ready");
}

function cleanupRevealDelays(elements: HTMLElement[]) {
  for (const element of elements) {
    if (element.dataset.autoRevealDelay === "1") {
      element.style.removeProperty("--reveal-delay");
      delete element.dataset.autoRevealDelay;
    }
  }
}

function setupScrollReveal(options: RevealOptions) {
  const root = document.documentElement;
  const elements = Array.from(document.querySelectorAll<HTMLElement>(options.selector));
  if (!elements.length) {
    return () => {};
  }

  const timeoutIds: number[] = [];
  const observer = createEntryObserver({
    timeoutIds,
    rootMargin: options.rootMargin,
    threshold: options.threshold,
    once: options.once,
  });
  const groupObservers: IntersectionObserver[] = [];
  root.classList.add("reveal-ready");
  void document.body.offsetHeight;

  let rafId: number | null = window.requestAnimationFrame(() => {
    runInitialRevealPhase({
      elements,
      timeoutIds,
      observer,
      groupObservers,
      rootMargin: options.rootMargin,
      threshold: options.threshold,
    });
    rafId = null;
  });

  return () => cleanupScrollReveal({ rafId, timeoutIds, elements, observer, groupObservers, root });
}

export function ScrollReveal({
  selector = "[data-reveal]",
  rootMargin = "0px 0px -8% 0px",
  threshold = 0.1,
  once = true,
}: ScrollRevealProps) {
  const pathname = usePathname();

  useLayoutEffect(
    () => setupScrollReveal({ selector, rootMargin, threshold, once }),
    [once, pathname, rootMargin, selector, threshold]
  );

  return null;
}
