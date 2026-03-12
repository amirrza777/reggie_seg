import { HelpNav } from "../HelpNav";

export default function AccountAccessHelpPage() {
  return (
    <div className="help-page">
      <div className="help-page__content stack">
        <div>
          <h1>Account & Access</h1>
          <p className="lede">Access is based on enrollment and role assignment.</p>
        </div>

        <HelpNav />

        <section className="stack">
          <h2>Access issues</h2>
          <p>If a module or project is missing, ask a staff lead or admin to verify your assignment.</p>
          <p>If you cannot sign in, use the Forgot password flow from the login page.</p>
        </section>
      </div>
    </div>
  );
}
