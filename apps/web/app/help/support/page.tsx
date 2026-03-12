import { HelpNav } from "../HelpNav";

export default function HelpSupportPage() {
  return (
    <div className="help-page">
      <div className="help-page__content stack">
        <div>
          <h1>Support</h1>
          <p className="lede">Get in touch with the support team.</p>
        </div>

        <HelpNav />

        <section className="stack">
          <h2>Contact support</h2>
          <p>For access issues, data concerns, or account problems, contact support.</p>
          <a className="btn btn--primary" href="mailto:support@teamfeedback.app">
            Contact support
          </a>
          <h3 className="help-page__subheading">Report a Bug / Request a Feature</h3>
          <p>When reporting an issue, include what happened, expected behavior, and steps to reproduce.</p>
          <p>Attach screenshots and your module or project context to help us diagnose quickly.</p>
        </section>
      </div>
    </div>
  );
}
