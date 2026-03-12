import Link from "next/link";
import { AppShell } from "@/shared/layout/AppShell";
import { Topbar } from "@/shared/layout/Topbar";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser } from "@/shared/auth/session";
import { faqItems } from "../content/marketing";
import { FaqAccordion } from "../components/FaqAccordion";
import { HelpSectionScroll } from "./HelpSectionScroll";

export const dynamic = "force-dynamic";

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

const studentHelpQuestions = new Set([
  "How do I update my profile details?",
  "Where can I see my projects?",
  "Can I edit or delete a peer feedback submission after submitting?",
  "What happens if a deadline passes before I submit?",
]);

const staffHelpQuestions = new Set([
  "How often is project and team data refreshed?",
  "Can I export feedback, marks, or attendance records?",
]);

const adminHelpQuestions = new Set([
  "How is my data stored and who can view it?",
]);

const generalHelpQuestions = new Set([
  "I cannot access a module or project.",
  "How do I get support?",
  "How do I reset my password if I cannot log in?",
  "Why cannot I see a module or project that my teammate can?",
  "What do the different user roles allow?",
  "What browsers and devices are supported?",
  "Where can I report a bug or request a feature?",
]);

const staffMarketingQuestions = new Set([
  "How does peer assessment work with custom questionnaires?",
  "Can we reuse questionnaires across modules and years?",
  "What data do you pull from GitHub, and what do you not pull?",
  "Can teams self-form or be auto-allocated?",
  "How do roles and permissions work?",
]);

const adminMarketingQuestions = new Set([
  "How does data archiving and GDPR compliance work?",
]);

const generalMarketingQuestions = new Set<string>([]);

export default async function HelpPage() {
  const user = await getCurrentUser();
  if (user?.suspended === true || user?.active === false) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
        <div className="card" style={{ maxWidth: 520, textAlign: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Account suspended</h2>
          <p className="muted" style={{ margin: 0 }}>
            Your account has been suspended by an administrator. Please contact support or your admin to restore access.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <a href="/login" className="btn btn--primary">
              Return to login
            </a>
          </div>
        </div>
      </main>
    );
  }

  const studentFaqs = additionalHelpFaqs.filter((item) => studentHelpQuestions.has(item.question));
  const staffFaqs = [
    ...faqItems.filter((item) => staffMarketingQuestions.has(item.question)),
    ...additionalHelpFaqs.filter((item) => staffHelpQuestions.has(item.question)),
  ];
  const adminFaqs = [
    ...faqItems.filter((item) => adminMarketingQuestions.has(item.question)),
    ...additionalHelpFaqs.filter((item) => adminHelpQuestions.has(item.question)),
  ];
  const generalFaqs = [
    ...faqItems.filter((item) => generalMarketingQuestions.has(item.question)),
    ...additionalHelpFaqs.filter((item) => generalHelpQuestions.has(item.question)),
  ];

  return (
    <AppShell
      topbar={<Topbar title="Team Feedback" titleHref="/dashboard" actions={<UserMenu />} />}
    >
      <div className="workspace-shell">
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

            <section className="section faq-section--left" id="faq">
              <div className="container stack faq-section__container--left">
                <div className="section__header">
                  <h2>FAQs</h2>
                  <p className="lede">Everything about questionnaires, permissions, GitHub data, and compliance.</p>
                </div>
                <div className="help-faq__groups">
                  <section className="help-faq__group" aria-labelledby="faq-students">
                    <h3 className="help-page__subheading help-faq__heading" id="faq-students">Student FAQs</h3>
                    <p className="help-faq__lede muted">Deadlines, submissions, and access to your workspace.</p>
                    <FaqAccordion items={studentFaqs} reveal={false} />
                  </section>
                  <section className="help-faq__group" aria-labelledby="faq-staff">
                    <h3 className="help-page__subheading help-faq__heading" id="faq-staff">Staff FAQs</h3>
                    <p className="help-faq__lede muted">Teaching workflows, questionnaires, and analytics visibility.</p>
                    <FaqAccordion items={staffFaqs} reveal={false} />
                  </section>
                  <section className="help-faq__group" aria-labelledby="faq-admin">
                    <h3 className="help-page__subheading help-faq__heading" id="faq-admin">Admin FAQs</h3>
                    <p className="help-faq__lede muted">Compliance, permissions, and platform governance.</p>
                    <FaqAccordion items={adminFaqs} reveal={false} />
                  </section>
                  <section className="help-faq__group" aria-labelledby="faq-general">
                    <h3 className="help-page__subheading help-faq__heading" id="faq-general">General FAQs</h3>
                    <p className="help-faq__lede muted">Account access, support, and troubleshooting.</p>
                    <FaqAccordion items={generalFaqs} reveal={false} />
                  </section>
                </div>
              </div>
            </section>

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
      </div>
    </AppShell>
  );
}
