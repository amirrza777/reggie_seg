export default function GettingStartedHelpPage() {
  return (
    <section className="help-section stack" aria-label="Getting started">
      <h2>Getting Started</h2>
      <p className="lede">Start with the steps that match your role in the workspace.</p>
      <details className="stack" open>
        <summary className="help-page__subheading">Students</summary>
        <p>1. Open your profile from the user menu and confirm your details.</p>
        <p>2. Go to Modules to review your active module spaces and deadlines.</p>
        <p>3. Go to Projects to view team activity, meetings, and assessments.</p>
        <p>Tip: Use the Calendar to keep track of upcoming meetings and submission deadlines.</p>
      </details>
      <details className="stack">
        <summary className="help-page__subheading">Staff</summary>
        <p>1. Confirm your profile details and notification preferences.</p>
        <p>2. Open Staff → Projects to review your active teaching spaces.</p>
        <p>3. Open Staff → Questionnaires to create or reuse assessment templates.</p>
        <p>Tip: Check Team allocation and Meetings to keep cohorts on schedule.</p>
      </details>
      <details className="stack">
        <summary className="help-page__subheading">Admins</summary>
        <p>1. Confirm your profile details and workspace settings.</p>
        <p>2. Open Admin → Users to verify roles and access assignments.</p>
        <p>3. Review Admin → Feature flags or Enterprises if your workspace uses them.</p>
        <p>Tip: Use the Audit log to verify changes and keep access aligned with policy.</p>
      </details>
    </section>
  );
}
