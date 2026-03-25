const onboardingTracks = [
  {
    id: "students",
    title: "Students",
    steps: [
      "Open your profile from the user menu and confirm your details.",
      "Go to Modules to review your active module spaces and deadlines.",
      "Go to Projects to view team activity, meetings, and assessments.",
    ],
    tip: "Tip: Use the Calendar to keep track of upcoming meetings and submission deadlines.",
  },
  {
    id: "staff",
    title: "Staff",
    steps: [
      "Confirm your profile details and notification preferences.",
      "Open Staff → Projects to review your active teaching spaces.",
      "Open Staff → Questionnaires to create or reuse assessment templates.",
    ],
    tip: "Tip: Check Team allocation and Meetings to keep cohorts on schedule.",
  },
  {
    id: "admins",
    title: "Admins",
    steps: [
      "Confirm your profile details and workspace settings.",
      "Open Admin → Users to verify roles and access assignments.",
      "Review Enterprise → Feature flags and Admin → Enterprises if your workspace uses them.",
    ],
    tip: "Tip: Use the Audit log to verify changes and keep access aligned with policy.",
  },
];

export default function GettingStartedHelpPage() {
  return (
    <section className="help-section help-section--playbook stack" aria-label="Getting started">
      <header className="help-section__header stack">
        <h2>Getting Started</h2>
        <p className="lede">Start with the steps that match your role in the workspace.</p>
      </header>

      <div className="help-playbook">
        {onboardingTracks.map((track, index) => (
          <details className="help-playbook__item stack" open={index === 0} key={track.id}>
            <summary className="help-page__subheading help-playbook__summary">{track.title}</summary>
            <ol className="help-playbook__steps">
              {track.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="help-playbook__tip">{track.tip}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
