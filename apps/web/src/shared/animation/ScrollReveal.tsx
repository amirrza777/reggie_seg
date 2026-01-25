"use client";

import { useLayoutEffect } from "react";

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
  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debug = params.has("revealDebug");
    const root = document.documentElement;

    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!elements.length) {
      return;
    }

    const pending = new Set(elements);
    const markVisible = (element: HTMLElement) => element.classList.add("is-visible");
    const markHidden = (element: HTMLElement) => element.classList.remove("is-visible");

    const groupSelector = "[data-reveal-group]";
    const elementGroup = new Map<HTMLElement, HTMLElement>();
    const groupMembers = new Map<HTMLElement, HTMLElement[]>();

    elements.forEach((element) => {
      const group = element.closest<HTMLElement>(groupSelector);
      if (!group) {
        return;
      }
      elementGroup.set(element, group);
      const members = groupMembers.get(group);
      if (members) {
        members.push(element);
      } else {
        groupMembers.set(group, [element]);
      }
    });

    const revealedGroups = new Set<HTMLElement>();
    const groupVisibleCounts = new Map<HTMLElement, number>();
    const elementVisibility = new Map<HTMLElement, boolean>();
    const supportsObserver = typeof IntersectionObserver !== "undefined";
    const elementObservers = new Map<HTMLElement, IntersectionObserver>();

    const stopObserving = (element: HTMLElement) => {
      const observer = elementObservers.get(element);
      if (!observer) {
        return;
      }
      observer.unobserve(element);
      observer.disconnect();
      elementObservers.delete(element);
    };

    const revealGroup = (group: HTMLElement) => {
      if (once && revealedGroups.has(group)) {
        return;
      }
      const members = groupMembers.get(group) ?? [];
      members.forEach((member) => {
        markVisible(member);
        if (once) {
          pending.delete(member);
          if (supportsObserver) {
            stopObserving(member);
          }
        }
      });
      if (once) {
        revealedGroups.add(group);
      }
    };

    const hideGroup = (group: HTMLElement) => {
      const members = groupMembers.get(group) ?? [];
      members.forEach((member) => {
        markHidden(member);
      });
    };

    const revealElement = (element: HTMLElement) => {
      markVisible(element);
      if (once) {
        pending.delete(element);
        if (supportsObserver) {
          stopObserving(element);
        }
      }
    };

    const hideElement = (element: HTMLElement) => {
      markHidden(element);
    };

    const updateGroupVisibility = (group: HTMLElement, element: HTMLElement, isVisible: boolean) => {
      const previous = elementVisibility.get(element) ?? false;
      if (previous === isVisible) {
        return;
      }
      elementVisibility.set(element, isVisible);
      const current = groupVisibleCounts.get(group) ?? 0;
      const next = Math.max(0, current + (isVisible ? 1 : -1));
      groupVisibleCounts.set(group, next);
      if (isVisible && current === 0) {
        revealGroup(group);
      } else if (!isVisible && next === 0) {
        hideGroup(group);
      }
    };

    const parseOffset = (value: string) => {
      const match = value.trim().match(/^(-?\d*\.?\d+)(px|%)?$/);
      if (!match) {
        return null;
      }
      return { value: Number.parseFloat(match[1]), unit: match[2] ?? "px" };
    };

    const normalizeMargin = (value: string) => {
      const parts = value.trim().split(/\s+/);
      if (parts.length === 1) {
        return [parts[0], parts[0], parts[0], parts[0]];
      }
      if (parts.length === 2) {
        return [parts[0], parts[1], parts[0], parts[1]];
      }
      if (parts.length === 3) {
        return [parts[0], parts[1], parts[2], parts[1]];
      }
      return [parts[0], parts[1], parts[2], parts[3]];
    };

    const baseMarginParts = normalizeMargin(rootMargin);
    const baseMarginBottomToken = baseMarginParts[2];
    const baseMarginBottomValue = parseOffset(baseMarginBottomToken) ?? { value: 0, unit: "px" };

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const resolveThreshold = (element: HTMLElement) => {
      const override = element.dataset.revealThreshold;
      if (!override) {
        return threshold;
      }
      const parsed = Number.parseFloat(override);
      if (!Number.isFinite(parsed)) {
        return threshold;
      }
      return clamp(parsed, 0, 1);
    };

    const resolveOffsetToken = (element: HTMLElement) => element.dataset.revealOffset ?? baseMarginBottomToken;
    const resolveOffsetValue = (element: HTMLElement) =>
      parseOffset(resolveOffsetToken(element)) ?? baseMarginBottomValue;

    const buildRootMargin = (bottom: string) => {
      const parts = [...baseMarginParts];
      parts[2] = bottom;
      return parts.join(" ");
    };

    const observers: IntersectionObserver[] = [];
    const elementSettings = new Map<
      HTMLElement,
      { threshold: number; bottomOffset: { value: number; unit: string } }
    >();

    root.classList.add("reveal-ready");

    const checkInView = () => {
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      const bottomOffset = (config: { value: number; unit: string }) =>
        config.unit === "%" ? (config.value / 100) * viewHeight : config.value;
      const groupsInView = new Set<HTMLElement>();
      pending.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const config = elementSettings.get(element);
        const elementThreshold = config?.threshold ?? resolveThreshold(element);
        const elementOffset = config?.bottomOffset ?? resolveOffsetValue(element);
        const thresholdPx = rect.height * elementThreshold;
        const isInView =
          rect.top < viewHeight + bottomOffset(elementOffset) - thresholdPx && rect.bottom > thresholdPx;
        if (isInView) {
          const group = elementGroup.get(element);
          if (group) {
            groupsInView.add(group);
          } else {
            revealElement(element);
          }
        } else if (!once) {
          const group = elementGroup.get(element);
          if (!group) {
            hideElement(element);
          }
        }
      });
      if (!groupMembers.size) {
        return;
      }
      if (once) {
        groupsInView.forEach((group) => {
          revealGroup(group);
        });
        return;
      }
      groupMembers.forEach((_members, group) => {
        if (groupsInView.has(group)) {
          revealGroup(group);
        } else {
          hideGroup(group);
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

    if (supportsObserver) {
      const startObserving = () => {
        elements.forEach((element) => {
          const elementThreshold = resolveThreshold(element);
          const elementOffset = resolveOffsetToken(element);
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                const target = entry.target as HTMLElement;
                const isVisible = entry.isIntersecting || entry.intersectionRatio >= elementThreshold;
                const group = elementGroup.get(target);
                if (isVisible) {
                  if (group) {
                    if (once) {
                      revealGroup(group);
                    } else {
                      updateGroupVisibility(group, target, true);
                    }
                  } else {
                    revealElement(target);
                  }
                } else if (!once) {
                  if (group) {
                    updateGroupVisibility(group, target, false);
                  } else {
                    hideElement(target);
                  }
                }
              });
            },
            {
              rootMargin: buildRootMargin(elementOffset),
              threshold: elementThreshold,
            }
          );
          observer.observe(element);
          observers.push(observer);
          elementObservers.set(element, observer);
        });
      };
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          startObserving();
          checkInView();
        })
      );
    } else {
      elements.forEach((element) => {
        elementSettings.set(element, {
          threshold: resolveThreshold(element),
          bottomOffset: resolveOffsetValue(element),
        });
      });
    }

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
    if (!supportsObserver) {
      requestAnimationFrame(() => requestAnimationFrame(checkInView));
      window.addEventListener("scroll", scheduleCheck, { passive: true });
      window.addEventListener("resize", scheduleCheck);
    }
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
      debugNode.style.background = "var(--backdrop-strong)";
      debugNode.style.color = "var(--on-surface-strong)";
      debugNode.style.fontSize = "12px";
      debugNode.style.fontFamily = "SF Pro Display, system-ui, sans-serif";
      debugNode.style.letterSpacing = "0.01em";
      document.body.appendChild(debugNode);
      updateDebug();
    }

    return () => {
      if (!supportsObserver) {
        window.removeEventListener("scroll", scheduleCheck);
        window.removeEventListener("resize", scheduleCheck);
      }
      window.removeEventListener("scroll", updateDebug);
      window.removeEventListener("resize", updateDebug);
      observers.forEach((observer) => observer.disconnect());
      if (debugNode) {
        debugNode.remove();
        debugNode = null;
      }
      root.classList.remove("reveal-ready");
    };
  }, [once, rootMargin, selector, threshold]);

  return null;
}
