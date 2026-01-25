"use client";

import type { ComponentProps, MouseEvent } from "react";

type AnchorLinkProps = ComponentProps<"a"> & {
  href: string;
};

export function AnchorLink({ href, onClick, ...props }: AnchorLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
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
    if (!href.startsWith("#")) {
      return;
    }
    const targetId = href.slice(1);
    if (!targetId) {
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    // Clear the hash so dev reloads don't keep snapping back to the anchor.
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}`);
  };

  return <a {...props} href={href} onClick={handleClick} />;
}
