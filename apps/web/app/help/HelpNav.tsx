import Link from "next/link";

const navItems = [
  { href: "/help", label: "Overview" },
  { href: "/help/getting-started", label: "Getting Started" },
  { href: "/help/account-access", label: "Account & Access" },
  { href: "/help/roles-permissions", label: "Roles & Permissions" },
  { href: "/help/faqs", label: "FAQs" },
  { href: "/help/support", label: "Support" },
];

export function HelpNav() {
  return (
    <nav className="help-nav" aria-label="Help sections">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="help-nav__link">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
