import Link from "next/link";
import { faqItems } from "../../content/marketing";
import { FaqSection } from "../../sections/marketing/FaqSection";
import { HelpSectionScroll } from "./HelpSectionScroll";

const additionalHelpFaqs = [
  {
    question: "How do I update my profile details?",
    answer: "Open your profile from the user menu, edit your details, then select Save changes.",
  },
  {
    question: "Where can I see my projects?",
    answer: "Go to Projects in the sidebar to view all projects you are assigned to.",
  },
  {
    question: "I cannot access a module or project.",
    answer: "If a module or project is missing, contact your staff lead or workspace administrator for access.",
  },
  {
    question: "How do I get support?",
    answer: "Use the Contact support link on this page to email the support team.",
  },
  {
    question: "How do I reset my password if I cannot log in?",
    answer: "Use the Forgot password option on the login page and follow the reset email instructions.",
  },
  {
    question: "Why cannot I see a module or project that my teammate can?",
    answer: "Access is role and enrollment based. If something is missing, ask your staff lead or admin to verify your assignment.",
  },
  {
    question: "What do the different user roles allow?",
    answer: "Students can access their own team and submissions, staff can manage teaching workflows, and admins can manage platform-wide settings.",
  },
  {
    question: "How often is project and team data refreshed?",
    answer: "Most workspace data updates after actions are saved. External integration data may refresh on scheduled syncs or manual refresh.",
  },
  {
    question: "Can I edit or delete a peer feedback submission after submitting?",
    answer: "This depends on your module settings. Some assessments allow edits before deadline, while others lock immediately after submit.",
  },
  {
    question: "What happens if a deadline passes before I submit?",
    answer: "Late submissions are controlled by your module rules. You may be locked out or flagged as late depending on staff configuration.",
  },
  {
    question: "How is my data stored and who can view it?",
    answer: "Your data is stored securely with role-based access controls so only authorized users can view relevant information.",
  },
  {
    question: "Can I export feedback, marks, or attendance records?",
    answer: "Export availability depends on the feature and your permissions. Staff and admins typically have broader export access.",
  },
  {
    question: "What browsers and devices are supported?",
    answer: "The platform is designed for modern browsers on desktop and mobile. For best experience, use the latest Chrome, Edge, Firefox, or Safari.",
  },
  {
    question: "Where can I report a bug or request a feature?",
    answer: "Use the Contact support button below and include steps to reproduce, screenshots, and your module or project context.",
  },
];

export default function HelpPage() {
  const combinedFaqs = [...faqItems, ...additionalHelpFaqs];

  return (
    <div className="help-page">
      <HelpSectionScroll />
      <nav className="help-page__toc" aria-label="Help page sections">
        <div className="help-page__toc-title">On this page</div>
        <Link href="/help?section=getting-started">Getting Started</Link>
        <Link href="/help?section=account-access">Account & Access</Link>
        <Link href="/help?section=roles-permissions">Roles & Permissions</Link>
        <Link href="/help?section=faq">FAQs</Link>
        <Link href="/help?section=contact-escalation">Contact & Escalation</Link>
        <Link href="/help?section=report-bug-feature">Report a Bug / Request a Feature</Link>
      </nav>

      <div className="stack help-page__content">
      <div id="help-overview">
        <h1>Help</h1>
        <p>Find answers to frequently asked questions about using Team Feedback.</p>
      </div>

      <section className="stack" id="getting-started">
        <div>
          <h2>Getting Started</h2>
          <p>Create your profile, check your modules, and open your assigned projects to begin.</p>
        </div>
        <div>
          <h3>Quick steps</h3>
          <p>1. Open your profile from the user menu and confirm your details.</p>
          <p>2. Go to Modules to review your active module spaces.</p>
          <p>3. Go to Projects to view team activity, meetings, and assessments.</p>
        </div>
      </section>

      <section className="stack" id="account-access">
        <h2>Account & Access</h2>
        <p>Access is based on your enrollment and role. If a module or project is missing, ask a staff lead or admin to review your assignment.</p>
        <p>If you cannot sign in, use the Forgot password flow from the login page.</p>
      </section>

      <section className="stack" id="roles-permissions">
        <h2>Roles & Permissions</h2>
        <p>Student: access your team spaces, submissions, and assigned workflows.</p>
        <p>Staff: manage teaching workflows, assessments, and module operations.</p>
        <p>Admin: manage platform-wide users, permissions, and operational controls.</p>
      </section>

      <FaqSection
        items={combinedFaqs}
        subheading="Everything about questionnaires, permissions, GitHub data, and compliance."
        reveal={false}
        leftAligned
        showMoreLink={false}
      />

      <section className="stack" id="contact-escalation">
        <h2>Contact & Escalation</h2>
        <p>For access issues, data concerns, or account problems, contact support.</p>
        <a className="btn btn--primary" href="mailto:support@teamfeedback.app">
          Contact support
        </a>
        <h3 className="help-page__subheading" id="report-bug-feature">Report a Bug / Request a Feature</h3>
        <p>When reporting an issue, include what happened, expected behavior, and steps to reproduce.</p>
        <p>Attach screenshots and your module or project context to help us diagnose quickly.</p>
      </section>
      </div>
    </div>
  );
}
