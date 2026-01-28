"use client";

import { useLayoutEffect } from "react";

type ScrollRevealProps = {
  selector?: string;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
};

type Offset = { value: number; unit: string };
type ElementSettings = { threshold: number; offset: Offset; rootMargin: string };
const debugStyles = {
  position: "fixed",
  bottom: "16px",
  left: "16px",
  zIndex: "9999",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "var(--backdrop-strong)",
  color: "var(--on-surface-strong)",
  fontSize: "12px",
  fontFamily: "SF Pro Display, system-ui, sans-serif",
  letterSpacing: "0.01em",
};

const parseOffset = (value: string): Offset | null => {
  const match = value.trim().match(/^(-?\d*\.?\d+)(px|%)?$/);
  if (!match) {
    return null;
  }
  return { value: Number.parseFloat(match[1]), unit: match[2] ?? "px" };
};

const normalizeMargin = (value: string) => {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const resolveThreshold = (element: HTMLElement, fallback: number) => {
  const override = element.dataset.revealThreshold;
  if (!override) return fallback;
  const parsed = Number.parseFloat(override);
  return Number.isFinite(parsed) ? clamp(parsed, 0, 1) : fallback;
};

const resolveOffsetToken = (element: HTMLElement, fallback: string) => element.dataset.revealOffset ?? fallback;

const buildRootMargin = (parts: string[], bottom: string) => {
  const next = [...parts];
  next[2] = bottom;
  return next.join(" ");
};

const collectElements = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector));

const collectGroups = (elements: HTMLElement[]) => {
  const elementGroup = new Map<HTMLElement, HTMLElement>();
  const groupMembers = new Map<HTMLElement, HTMLElement[]>();
  const selector = "[data-reveal-group]";
  elements.forEach((element) => {
    const group = element.closest<HTMLElement>(selector);
    if (!group) return;
    elementGroup.set(element, group);
    const members = groupMembers.get(group) ?? [];
    members.push(element);
    groupMembers.set(group, members);
  });
  return { elementGroup, groupMembers };
};

const createElementSettings = (
  elements: HTMLElement[],
  baseMarginParts: string[],
  threshold: number,
  baseOffsetToken: string,
  baseOffsetValue: Offset
) => {
  const settings = new Map<HTMLElement, ElementSettings>();
  elements.forEach((element) => {
    const elementThreshold = resolveThreshold(element, threshold);
    const offsetToken = resolveOffsetToken(element, baseOffsetToken);
    const offset = parseOffset(offsetToken) ?? baseOffsetValue;
    settings.set(element, {
      threshold: elementThreshold,
      offset,
      rootMargin: buildRootMargin(baseMarginParts, offsetToken),
    });
  });
  return settings;
};

const createStopObserving = (elementObservers: Map<HTMLElement, IntersectionObserver>) => (element: HTMLElement) => {
  const observer = elementObservers.get(element);
  if (!observer) return;
  observer.unobserve(element);
  observer.disconnect();
  elementObservers.delete(element);
};

const createRevealElement = (
  pending: Set<HTMLElement>,
  once: boolean,
  supportsObserver: boolean,
  stopObserving: (element: HTMLElement) => void
) => (element: HTMLElement) => {
  element.classList.add("is-visible");
  if (!once) return;
  pending.delete(element);
  if (supportsObserver) {
    stopObserving(element);
  }
};

const hideElement = (element: HTMLElement) => element.classList.remove("is-visible");

const createGroupControllers = (
  groupMembers: Map<HTMLElement, HTMLElement[]>,
  once: boolean,
  revealElement: (element: HTMLElement) => void,
  hideElementFn: (element: HTMLElement) => void
) => {
  const revealedGroups = new Set<HTMLElement>();
  const groupVisibleCounts = new Map<HTMLElement, number>();
  const elementVisibility = new Map<HTMLElement, boolean>();
  const revealGroup = (group: HTMLElement) => {
    if (once && revealedGroups.has(group)) return;
    (groupMembers.get(group) ?? []).forEach(revealElement);
    if (once) revealedGroups.add(group);
  };
  const hideGroup = (group: HTMLElement) => (groupMembers.get(group) ?? []).forEach(hideElementFn);
  const updateGroupVisibility = (group: HTMLElement, element: HTMLElement, isVisible: boolean) => {
    const previous = elementVisibility.get(element) ?? false;
    if (previous === isVisible) return;
    elementVisibility.set(element, isVisible);
    const current = groupVisibleCounts.get(group) ?? 0;
    const next = Math.max(0, current + (isVisible ? 1 : -1));
    groupVisibleCounts.set(group, next);
    if (isVisible && current === 0) revealGroup(group);
    else if (!isVisible && next === 0) hideGroup(group);
  };

  return { revealGroup, hideGroup, updateGroupVisibility };
};

const createVisibilityHandler = ({
  elementGroup,
  once,
  revealElement,
  hideElement: hide,
  revealGroup,
  hideGroup,
  updateGroupVisibility,
}: {
  elementGroup: Map<HTMLElement, HTMLElement>;
  once: boolean;
  revealElement: (element: HTMLElement) => void;
  hideElement: (element: HTMLElement) => void;
  revealGroup: (group: HTMLElement) => void;
  hideGroup: (group: HTMLElement) => void;
  updateGroupVisibility: (group: HTMLElement, element: HTMLElement, isVisible: boolean) => void;
}) => (element: HTMLElement, isVisible: boolean) => {
  const group = elementGroup.get(element);
  if (group) {
    if (once) {
      if (isVisible) revealGroup(group);
    } else {
      updateGroupVisibility(group, element, isVisible);
    }
    return;
  }
  if (isVisible) {
    revealElement(element);
  } else if (!once) {
    hide(element);
  }
};

const setupObservers = (
  elements: HTMLElement[],
  settings: Map<HTMLElement, ElementSettings>,
  handleVisibility: (element: HTMLElement, isVisible: boolean) => void,
  elementObservers: Map<HTMLElement, IntersectionObserver>
) => {
  const observers: IntersectionObserver[] = [];
  elements.forEach((element) => {
    const config = settings.get(element);
    if (!config) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting || entry.intersectionRatio >= config.threshold;
          handleVisibility(entry.target as HTMLElement, isVisible);
        });
      },
      { rootMargin: config.rootMargin, threshold: config.threshold }
    );
    observer.observe(element);
    observers.push(observer);
    elementObservers.set(element, observer);
  });
  return () => observers.forEach((observer) => observer.disconnect());
};

const toPixels = (offset: Offset, viewHeight: number) =>
  offset.unit === "%" ? (offset.value / 100) * viewHeight : offset.value;

const primeVisibility = (
  elements: HTMLElement[],
  settings: Map<HTMLElement, ElementSettings>,
  handleVisibility: (element: HTMLElement, isVisible: boolean) => void
) => {
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  elements.forEach((element) => {
    const config = settings.get(element);
    if (!config) return;
    const rect = element.getBoundingClientRect();
    const thresholdPx = rect.height * config.threshold;
    const offsetPx = toPixels(config.offset, viewHeight);
    const isVisible = rect.top < viewHeight + offsetPx - thresholdPx && rect.bottom > thresholdPx;
    if (isVisible) {
      handleVisibility(element, true);
    }
  });
};

const setupFallback = (
  supportsObserver: boolean,
  elements: HTMLElement[],
  settings: Map<HTMLElement, ElementSettings>,
  handleVisibility: (element: HTMLElement, isVisible: boolean) => void
) => {
  if (supportsObserver) return () => {};
  const checkInView = () => {
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    elements.forEach((element) => {
      const config = settings.get(element);
      if (!config) return;
      const rect = element.getBoundingClientRect();
      const thresholdPx = rect.height * config.threshold;
      const offsetPx = toPixels(config.offset, viewHeight);
      const isVisible = rect.top < viewHeight + offsetPx - thresholdPx && rect.bottom > thresholdPx;
      handleVisibility(element, isVisible);
    });
  };
  const scheduleCheck = () => requestAnimationFrame(checkInView);
  window.addEventListener("scroll", scheduleCheck, { passive: true });
  window.addEventListener("resize", scheduleCheck);
  requestAnimationFrame(checkInView);
  return () => {
    window.removeEventListener("scroll", scheduleCheck);
    window.removeEventListener("resize", scheduleCheck);
  };
};

const setupDebugOverlay = (debug: boolean, elements: HTMLElement[]) => {
  if (!debug) return () => {};
  const node = document.createElement("div");
  Object.assign(node.style, debugStyles);
  const updateDebug = () => {
    const visibleCount = elements.filter((el) => el.classList.contains("is-visible")).length;
    node.textContent = `ScrollReveal | elements: ${elements.length} | visible: ${visibleCount} | scrollY: ${Math.round(window.scrollY)}`;
  };
  document.body.appendChild(node);
  window.addEventListener("scroll", updateDebug, { passive: true });
  window.addEventListener("resize", updateDebug);
  updateDebug();
  return () => {
    window.removeEventListener("scroll", updateDebug);
    window.removeEventListener("resize", updateDebug);
    node.remove();
  };
};

const createBaseState = (options: Required<ScrollRevealProps>) => {
  const root = document.documentElement;
  const elements = collectElements(options.selector);
  if (!elements.length) return null;
  const baseMarginParts = normalizeMargin(options.rootMargin);
  const baseOffsetToken = baseMarginParts[2];
  const baseOffsetValue = parseOffset(baseOffsetToken) ?? { value: 0, unit: "px" };
  const settings = createElementSettings(elements, baseMarginParts, options.threshold, baseOffsetToken, baseOffsetValue);
  const { elementGroup, groupMembers } = collectGroups(elements);
  return { root, elements, settings, elementGroup, groupMembers };
};

const createVisibility = (
  options: Required<ScrollRevealProps>,
  elements: HTMLElement[],
  elementGroup: Map<HTMLElement, HTMLElement>,
  groupMembers: Map<HTMLElement, HTMLElement[]>
) => {
  const pending = new Set(elements);
  const elementObservers = new Map<HTMLElement, IntersectionObserver>();
  const supportsObserver = typeof IntersectionObserver !== "undefined";
  const stopObserving = createStopObserving(elementObservers);
  const revealElement = createRevealElement(pending, options.once, supportsObserver, stopObserving);
  const groupControllers = createGroupControllers(groupMembers, options.once, revealElement, hideElement);
  const handleVisibility = createVisibilityHandler({
    elementGroup,
    once: options.once,
    revealElement,
    hideElement,
    ...groupControllers,
  });
  return { supportsObserver, elementObservers, handleVisibility };
};

const setupScrollReveal = (options: Required<ScrollRevealProps>) => {
  const debug = new URLSearchParams(window.location.search).has("revealDebug");
  const baseState = createBaseState(options);
  if (!baseState) return;
  const { root, elements, settings, elementGroup, groupMembers } = baseState;
  const visibility = createVisibility(options, elements, elementGroup, groupMembers);
  primeVisibility(elements, settings, visibility.handleVisibility);
  root.classList.add("reveal-ready");
  const cleanupObserver = visibility.supportsObserver
    ? setupObservers(elements, settings, visibility.handleVisibility, visibility.elementObservers)
    : () => {};
  const cleanupFallback = setupFallback(
    visibility.supportsObserver,
    elements,
    settings,
    visibility.handleVisibility
  );
  const cleanupDebug = setupDebugOverlay(debug, elements);
  return () => {
    cleanupFallback();
    cleanupObserver();
    cleanupDebug();
    root.classList.remove("reveal-ready");
  };
};

export function ScrollReveal({
  selector = "[data-reveal]",
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.2,
  once = true,
}: ScrollRevealProps) {
  useLayoutEffect(() => {
    const cleanup = setupScrollReveal({ selector, rootMargin, threshold, once });
    return cleanup ?? undefined;
  }, [once, rootMargin, selector, threshold]);

  return null;
}
