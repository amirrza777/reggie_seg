"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/help", label: "Overview" },
  { href: "/help/getting-started", label: "Getting Started" },
  { href: "/help/account-access", label: "Account & Access" },
  { href: "/help/roles-permissions", label: "Roles & Permissions" },
  { href: "/help/faqs", label: "FAQs" },
  { href: "/help/support", label: "Support" },
];

export function HelpNav() {
  const pathname = usePathname();

  return (
    <nav className="help-nav" data-elevation="sticky" aria-label="Help sections">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`help-nav__link${pathname === item.href ? " help-nav__link--active" : ""}`}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
