import Link from "next/link";
import { HelpOverviewSearch } from "./HelpOverviewSearch";
import { helpOverviewSearchItems } from "./helpFaqData";
import { HelpTopQuestions } from "./HelpTopQuestions";

export default function HelpPage() {
  return (
    <section className="help-hub__overview stack" aria-label="Help overview">
      <header className="help-hub__overview-header stack" id="overview">
        <h2>Overview</h2>
        <p className="muted">
          This help center is organized by topic. Use the tabs above to switch between Getting Started, Account &
          Access, Roles & Permissions, FAQs, and Support.
        </p>
      </header>

      <HelpOverviewSearch items={helpOverviewSearchItems} />

      <section className="help-hub__topics stack" id="topics" aria-label="Help topics">
        <div className="help-hub__topics-head">
          <h3>Browse by topic</h3>
          <p className="muted">Choose the area that best matches what you need.</p>
        </div>

        <div className="help-hub__grid" aria-label="Help sections">
          <Link className="help-hub__card" href="/help/getting-started">
            <div className="help-hub__card-content">
              <h3>Getting Started</h3>
              <p className="muted">Profile setup, modules, and your first project steps.</p>
            </div>
            <span className="help-hub__card-action">Open guide</span>
          </Link>
          <Link className="help-hub__card" href="/help/account-access">
            <div className="help-hub__card-content">
              <h3>Account & Access</h3>
              <p className="muted">Sign-in issues, missing modules, and account recovery.</p>
            </div>
            <span className="help-hub__card-action">Resolve access</span>
          </Link>
          <Link className="help-hub__card" href="/help/roles-permissions">
            <div className="help-hub__card-content">
              <h3>Roles & Permissions</h3>
              <p className="muted">What students, staff, and admins can do.</p>
            </div>
            <span className="help-hub__card-action">View role matrix</span>
          </Link>
          <Link className="help-hub__card" href="/help/faqs">
            <div className="help-hub__card-content">
              <h3>FAQs</h3>
              <p className="muted">Search and browse the full knowledge base.</p>
            </div>
            <span className="help-hub__card-action">Search FAQs</span>
          </Link>
          <Link className="help-hub__card" href="/help/support">
            <div className="help-hub__card-content">
              <h3>Support</h3>
              <p className="muted">Contact support and report issues.</p>
            </div>
            <span className="help-hub__card-action">Get support</span>
          </Link>
        </div>
      </section>

      <section id="top-questions">
        <HelpTopQuestions />
      </section>
    </section>
  );
}
