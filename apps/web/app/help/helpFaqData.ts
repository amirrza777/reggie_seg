import { faqItems } from "../content/marketing";

type HelpFaqItem = {
  question: string;
  answer: string;
  links?: Array<{ label: string; href: string }>;
};

type HelpFaqGroup = {
  id: string;
  title: string;
  description: string;
  items: HelpFaqItem[];
};

const additionalHelpFaqs: HelpFaqItem[] = [
  {
    question: "How do I update my profile details?",
    answer: "Open your profile from the user menu, edit your details, then select Save changes.",
  },
  {
    question: "Is peer feedback anonymous?",
    answer: "Yes. Peer feedback is currently always anonymous.",
  },
  {
    question: "Where can I see my projects?",
    answer: "Go to Projects in the sidebar to view all projects you are assigned to.",
    links: [{ label: "Open Projects", href: "/projects" }],
  },
  {
    question: "How do I view my team's meeting schedule?",
    answer: "Open Projects, select your project, then go to Meetings or the Meeting scheduler to see upcoming sessions.",
    links: [
      { label: "Open Projects", href: "/projects" },
      { label: "View Calendar", href: "/calendar" },
    ],
  },
  {
    question: "Where do I see my peer assessment?",
    answer: "Open your project and go to Peer Assessments to view your submissions and required reviews.",
    links: [{ label: "Open Projects", href: "/projects" }],
  },
  {
    question: "I cannot access a module or project.",
    answer: "If a module or project is missing, contact your staff lead or workspace administrator for access.",
  },
  {
    question: "How do I join a team if I'm not assigned?",
    answer: "If team invitations are enabled, you'll see invites in your project. Otherwise, contact your staff lead to be added.",
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
    question: "How do I create and schedule a questionnaire?",
    answer: "Go to Staff -> Questionnaires to create or reuse a template, then apply it to a module or project when setting up assessments.",
    links: [{ label: "Open Staff Questionnaires", href: "/staff/questionnaires" }],
  },
  {
    question: "How do I manage team allocations?",
    answer: "Open Staff -> Projects, choose a project, then use the Team allocation page to review and adjust teams.",
    links: [{ label: "Open Staff Projects", href: "/staff/projects" }],
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
    question: "How do I manage staff vs student permissions?",
    answer: "Admins can update user roles and access from the Admin -> Users area.",
  },
  {
    question: "How do I audit changes or activity?",
    answer: "Admins can open the Audit log in the Admin workspace to review activity and export records.",
  },
  {
    question: "How do I configure feature flags?",
    answer: "Admins can enable or disable feature flags from the Admin -> Feature flags area.",
  },
  {
    question: "How do I add or remove an enterprise workspace?",
    answer: "Admins can manage enterprises in the Admin -> Enterprises area.",
  },
  {
    question: "Why am I seeing \"Account suspended\"?",
    answer: "Your account was suspended by an administrator. Contact support or your admin to restore access.",
  },
  {
    question: "What should I do if data looks out of date?",
    answer: "Refresh the page first. If it persists, contact support with the module or project name.",
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
  "Is peer feedback anonymous?",
  "Where can I see my projects?",
  "How do I view my team's meeting schedule?",
  "Where do I see my peer assessment?",
  "Can I edit or delete a peer feedback submission after submitting?",
  "What happens if a deadline passes before I submit?",
  "How do I join a team if I'm not assigned?",
]);

const staffHelpQuestions = new Set([
  "How do I create and schedule a questionnaire?",
  "How do I manage team allocations?",
  "How often is project and team data refreshed?",
  "Can I export feedback, marks, or attendance records?",
]);

const adminHelpQuestions = new Set([
  "How is my data stored and who can view it?",
  "How do I manage staff vs student permissions?",
  "How do I audit changes or activity?",
  "How do I configure feature flags?",
  "How do I add or remove an enterprise workspace?",
  "Why am I seeing \"Account suspended\"?",
  "What should I do if data looks out of date?",
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

export const faqGroups: HelpFaqGroup[] = [
  {
    id: "faq-general",
    title: "General FAQs",
    description: "Account access, support, and troubleshooting.",
    items: generalFaqs,
  },
  {
    id: "faq-students",
    title: "Student FAQs",
    description: "Deadlines, submissions, and access to your workspace.",
    items: studentFaqs,
  },
  {
    id: "faq-staff",
    title: "Staff FAQs",
    description: "Teaching workflows, questionnaires, and analytics visibility.",
    items: staffFaqs,
  },
  {
    id: "faq-admin",
    title: "Admin FAQs",
    description: "Compliance, permissions, and platform governance.",
    items: adminFaqs,
  },
];

export type HelpSearchItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  kind: "task" | "faq";
  group?: string;
};

const faqSearchItems = faqGroups.flatMap((group) =>
  group.items.map((item) => ({
    id: `faq-${item.question}`,
    title: item.question,
    description: item.answer,
    href: item.links?.[0]?.href ?? "/help/faq",
    kind: "faq" as const,
    group: group.title,
  })),
);

export const helpOverviewSearchItems: HelpSearchItem[] = [
  {
    id: "help-getting-started",
    title: "Getting Started",
    description: "Profile setup, modules, and your first project steps.",
    href: "/help/getting-started",
    kind: "task",
  },
  {
    id: "help-account-access",
    title: "Account & Access",
    description: "Sign-in issues, missing modules, and account recovery.",
    href: "/help/account-access",
    kind: "task",
  },
  {
    id: "help-roles-permissions",
    title: "Roles & Permissions",
    description: "What students, staff, and admins can do.",
    href: "/help/roles-permissions",
    kind: "task",
  },
  {
    id: "help-faqs",
    title: "FAQs",
    description: "Search and browse the full knowledge base.",
    href: "/help/faq",
    kind: "task",
  },
  {
    id: "help-support",
    title: "Support",
    description: "Contact support and report issues.",
    href: "/help/support",
    kind: "task",
  },
  {
    id: "help-task-reset-password",
    title: "Reset password",
    description: "Account recovery and login help.",
    href: "/help/account-access",
    kind: "task",
  },
  {
    id: "help-task-meeting-schedules",
    title: "Find meeting schedules",
    description: "Where to view upcoming team meetings.",
    href: "/help/faq",
    kind: "task",
  },
  {
    id: "help-task-peer-assessment",
    title: "Complete peer assessment",
    description: "How to submit and review peer feedback.",
    href: "/help/faq",
    kind: "task",
  },
  {
    id: "help-task-check-role",
    title: "Check my role",
    description: "Understand your access level.",
    href: "/help/roles-permissions",
    kind: "task",
  },
  ...faqSearchItems,
];
