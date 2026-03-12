import Link from "next/link";
import { HelpNav } from "./HelpNav";

export default function HelpPage() {
  return (
    <div className="help-page">
      <div className="help-page__content stack">
        <div className="help-hub__hero">
          <p className="eyebrow">Help Center</p>
          <h1>Help</h1>
          <p className="lede">Find guidance by topic or jump straight to common tasks.</p>
        </div>

        <HelpNav />

        <section className="help-hub__grid" aria-label="Help sections">
          <Link className="card help-hub__card" href="/help/getting-started">
            <div>
              <h3>Getting Started</h3>
              <p className="muted">Profile setup, modules, and your first project steps.</p>
            </div>
          </Link>
          <Link className="card help-hub__card" href="/help/account-access">
            <div>
              <h3>Account & Access</h3>
              <p className="muted">Sign-in issues, missing modules, and account recovery.</p>
            </div>
          </Link>
          <Link className="card help-hub__card" href="/help/roles-permissions">
            <div>
              <h3>Roles & Permissions</h3>
              <p className="muted">What students, staff, and admins can do.</p>
            </div>
          </Link>
          <Link className="card help-hub__card" href="/help/faq">
            <div>
              <h3>FAQs</h3>
              <p className="muted">Search and browse the full knowledge base.</p>
            </div>
          </Link>
          <Link className="card help-hub__card" href="/help/support">
            <div>
              <h3>Support</h3>
              <p className="muted">Contact support and report issues.</p>
            </div>
          </Link>
        </section>

        <section className="help-hub__tasks" aria-label="Top tasks">
          <h2>Top tasks</h2>
          <div className="help-hub__tasks-grid">
            <Link href="/help/account-access" className="link-ghost">Reset password</Link>
            <Link href="/help/faq" className="link-ghost">Find meeting schedules</Link>
            <Link href="/help/faq" className="link-ghost">Complete peer assessment</Link>
            <Link href="/help/roles-permissions" className="link-ghost">Check my role</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
