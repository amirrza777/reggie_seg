"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandWordmark } from "./BrandWordmark";

type FooterLink = { href: string; label: string };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/?section=product", label: "Peer assessment" },
      { href: "/?section=toolkit", label: "Questionnaires" },
      { href: "/?section=health", label: "Meetings" },
      { href: "/?section=integrations", label: "Integrations" },
      { href: "/?section=about", label: "Roles and permissions" },
      { href: "/?section=showcase", label: "Analytics" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/?section=resources", label: "Guides" },
      { href: "/?section=resources", label: "Templates" },
      { href: "/?section=faq", label: "FAQ" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { href: "/?section=sync", label: "GitHub" },
      { href: "/?section=sync", label: "Trello" },
      { href: "/?section=integrations", label: "VLE (placeholder)" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/status", label: "Status" },
    ],
  },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`footer__col${open ? " footer__col--open" : ""}`}>
      <button
        className="footer__col-summary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="footer__col-icon" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div className="footer__links">
        {links.map((link) => (
          <Link key={`${link.href}-${link.label}`} href={link.href} className="footer__link">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        {/*
         * Nav is first in the DOM so that on mobile the accordion appears at the
         * top. CSS grid-template-areas repositions it to the right column on
         * desktop and below the brand on tablet.
         */}
        <nav className="footer__nav" aria-label="Site links">
          {columns.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links} />
          ))}
        </nav>

        <div className="footer__brand">
          <div className="footer__brand-logo">
            <BrandWordmark />
          </div>
          <p className="footer__brand-tagline">
            Run peer assessment cycles, meetings, and monitoring from one place.
          </p>
        </div>
      </div>

      <div className="footer__bar">
        <div className="footer__bar-inner">
          <span className="footer__bar-copy">© {new Date().getFullYear()} Team Feedback</span>
          <div className="footer__bar-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
