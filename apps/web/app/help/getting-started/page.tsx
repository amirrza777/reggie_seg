import { HelpNav } from "../HelpNav";

export default function GettingStartedHelpPage() {
  return (
    <div className="help-page">
      <div className="help-page__content stack">
        <div>
          <h1>Getting Started</h1>
          <p className="lede">Set up your profile and get oriented in your workspace.</p>
        </div>

        <HelpNav />

        <section className="stack">
          <h2>Quick steps</h2>
          <p>1. Open your profile from the user menu and confirm your details.</p>
          <p>2. Go to Modules to review your active module spaces.</p>
          <p>3. Go to Projects to view team activity, meetings, and assessments.</p>
        </section>
      </div>
    </div>
  );
}
