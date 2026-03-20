import Link from "next/link";
import { HelpOverviewSearch } from "./HelpOverviewSearch";
import { helpOverviewSearchItems } from "./helpFaqData";
import { HelpTopQuestions } from "./HelpTopQuestions";

const helpTopicCards = [
  {
    href: "/help/getting-started",
    title: "Getting Started",
    description: "Profile setup, modules, and your first project steps.",
    action: "Open guide",
  },
  {
    href: "/help/account-access",
    title: "Account & Access",
    description: "Sign-in issues, missing modules, and account recovery.",
    action: "Resolve access",
  },
  {
    href: "/help/roles-permissions",
    title: "Roles & Permissions",
    description: "What students, staff, and admins can do.",
    action: "View role matrix",
  },
  {
    href: "/help/faqs",
    title: "FAQs",
    description: "Search and browse the full knowledge base.",
    action: "Search FAQs",
  },
  {
    href: "/help/support",
    title: "Support",
    description: "Contact support and report issues.",
    action: "Get support",
  },
];

export default function HelpPage() {
  return (
    <section className="help-hub__overview stack" aria-label="Help overview">
      <HelpOverviewHeader />
      <HelpOverviewSearch items={helpOverviewSearchItems} />
      <HelpTopicSection />
      <section id="top-questions">
        <HelpTopQuestions />
      </section>
    </section>
  );
}

function HelpOverviewHeader() {
  return (
    <header className="help-hub__overview-header stack" id="overview">
      <h2>Overview</h2>
      <p className="muted">
        This help center is organized by topic. Use the tabs above to switch between Getting Started, Account &
        Access, Roles & Permissions, FAQs, and Support.
      </p>
    </header>
  );
}

function HelpTopicSection() {
  return (
    <section className="help-hub__topics stack" id="topics" aria-label="Help topics">
      <div className="help-hub__topics-head">
        <h3>Browse by topic</h3>
        <p className="muted">Choose the area that best matches what you need.</p>
      </div>

      <div className="help-hub__grid" aria-label="Help sections">
        {helpTopicCards.map((card) => (
          <HelpTopicCard key={card.href} {...card} />
        ))}
      </div>
    </section>
  );
}

function HelpTopicCard({
  href,
  title,
  description,
  action,
}: {
  href: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link className="help-hub__card" href={href}>
      <div className="help-hub__card-content">
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      <span className="help-hub__card-action">{action}</span>
    </Link>
  );
}
