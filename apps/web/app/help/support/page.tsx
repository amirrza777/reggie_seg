import { HelpContactCta } from "../HelpContactCta";

export default function HelpSupportPage() {
  return (
    <section className="help-section stack" aria-label="Support">
      <div>
        <h2>Support</h2>
        <p className="lede">Get in touch with the support team.</p>
      </div>

      <div className="stack">
        <h3 className="help-support__heading">Contact support</h3>
        <p>For access issues, data concerns, or account problems, contact support.</p>
        <p>Support is available by email at support@teamfeedback.app.</p>
        <HelpContactCta label="Contact support" href="mailto:support@teamfeedback.app" />
        <h4 className="help-page__subheading help-support__heading">Report a Bug / Request a Feature</h4>
        <p>When reporting an issue, include what happened, expected behavior, and steps to reproduce.</p>
        <p>Attach screenshots and your module or project context to help us diagnose quickly.</p>
      </div>
    </section>
  );
}
