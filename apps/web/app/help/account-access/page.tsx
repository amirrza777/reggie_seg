export default function AccountAccessHelpPage() {
  return (
    <section className="help-section help-section--article stack" aria-label="Account and access">
      <header className="help-section__header stack">
        <h2>Account & Access</h2>
        <p className="lede">Access is based on enrollment and role assignment.</p>
      </header>

      <div className="help-section__grid">
        <article className="help-section__card stack">
          <h3>Access issues</h3>
          <p>If a module or project is missing, ask a staff lead or admin to verify your assignment.</p>
          <p>If you cannot sign in, use the Forgot password flow from the login page.</p>
        </article>

        <article className="help-section__card stack">
          <h3>Login & recovery</h3>
          <p>The login screen includes a "Forgot password?" link that emails a reset link.</p>
          <p>If your account is suspended, contact support or your workspace admin to restore access.</p>
        </article>
      </div>
    </section>
  );
}
