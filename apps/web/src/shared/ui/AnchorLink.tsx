"use client";

import type { ComponentProps, MouseEvent } from "react";

type AnchorLinkProps = ComponentProps<"a"> & {
  href: string;
};

const isUnmodifiedLeftClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

const scrollToHash = (href: string) => {
  if (!href.startsWith("#")) {
    return false;
  }
  const targetId = href.slice(1);
  if (!targetId) {
    return false;
  }
  const target = document.getElementById(targetId);
  if (!target) {
    return false;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
};

export function AnchorLink({ href, onClick, ...props }: AnchorLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !isUnmodifiedLeftClick(event)) {
      return;
    }
    const handled = scrollToHash(href);
    if (handled) {
      event.preventDefault();
    }
  };

  return <a {...props} href={href} onClick={handleClick} />;
}
