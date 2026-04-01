import type { Prisma } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";

type SeedHelpTopic = {
  slug: string;
  title: string;
  description?: string;
  sortOrder: number;
};

type SeedHelpArticle = {
  slug: string;
  topicSlug: string;
  title: string;
  summary?: string;
  audience?: string;
  sortOrder: number;
  body: string;
};

type SeedHelpFaqGroup = {
  slug: string;
  topicSlug: string;
  title: string;
  description?: string;
  audience?: string;
  sortOrder: number;
};

type SeedHelpFaq = {
  slug: string;
  groupSlug: string;
  question: string;
  answer: string;
  sortOrder: number;
  links?: Array<{ label: string; href: string }>;
};

const helpTopics: SeedHelpTopic[] = [
  { slug: "overview", title: "Overview", sortOrder: 1 },
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Profile setup, modules, and your first project steps.",
    sortOrder: 2,
  },
  {
    slug: "account-access",
    title: "Account & Access",
    description: "Sign-in issues, missing modules, and account recovery.",
    sortOrder: 3,
  },
  {
    slug: "roles-permissions",
    title: "Roles & Permissions",
    description: "What students, staff, and admins can do.",
    sortOrder: 4,
  },
  { slug: "faqs", title: "FAQs", description: "Search and browse the full knowledge base.", sortOrder: 5 },
  { slug: "support", title: "Support", description: "Contact support and report issues.", sortOrder: 6 },
];

const helpArticles: SeedHelpArticle[] = [
  {
    slug: "help-overview",
    topicSlug: "overview",
    title: "Help Center Overview",
    summary: "This help center is organized by topic for common tasks and troubleshooting.",
    sortOrder: 1,
    body: [
      "This help center is organized by topic. Use the tabs above to switch between Getting Started, Account & Access, Roles & Permissions, FAQs, and Support.",
      "",
      "Coverage: Guides for students, staff, and admins.",
      "Knowledge Base: Searchable FAQs and task-based walkthroughs.",
      "Support: Email support@teamfeedback.app for urgent issues.",
      "",
      "Browse by topic to find role-specific onboarding, account recovery guidance, permission explanations, or support contact details.",
    ].join("\n"),
  },
  {
    slug: "getting-started-playbook",
    topicSlug: "getting-started",
    title: "Getting Started",
    summary: "Start with the steps that match your role in the workspace.",
    sortOrder: 1,
    body: [
      "Students",
      "- Open your profile from the user menu and confirm your details.",
      "- Go to Modules to review your active module spaces and deadlines.",
      "- Go to Projects to view team activity, meetings, and assessments.",
      "Tip: Use the Calendar to keep track of upcoming meetings and submission deadlines.",
      "",
      "Staff",
      "- Confirm your profile details and notification preferences.",
      "- Open Staff -> Projects to review your active teaching spaces.",
      "- Open Staff -> Questionnaires to create or reuse assessment templates.",
      "Tip: Check Team allocation and Meetings to keep cohorts on schedule.",
      "",
      "Admins",
      "- Confirm your profile details and workspace settings.",
      "- Open Admin -> Users to verify roles and access assignments.",
      "- Review Enterprise -> Feature flags and Admin -> Enterprises if your workspace uses them.",
      "Tip: Use the Audit log to verify changes and keep access aligned with policy.",
    ].join("\n"),
  },
  {
    slug: "account-access-guide",
    topicSlug: "account-access",
    title: "Account & Access",
    sortOrder: 1,
    body: [
      "Access issues",
      "- If a module or project is missing, ask a staff lead or admin to verify your assignment.",
      "- If you cannot sign in, use the Forgot password flow from the login page.",
      "",
      "Login & recovery",
      '- The login screen includes a "Forgot password?" link that emails a reset link.',
      "- If your account is suspended, contact support or your workspace admin to restore access.",
    ].join("\n"),
  },
  {
    slug: "roles-permissions-guide",
    topicSlug: "roles-permissions",
    title: "Roles & Permissions",
    summary: "Each role unlocks different capabilities in the platform.",
    sortOrder: 1,
    body: [
      "Role overview",
      "- Student: Access your team spaces, submissions, and assigned workflows.",
      "- Staff: Manage teaching workflows, assessments, and module operations.",
      "- Enterprise Admin: Manage enterprise-level workspaces and settings.",
      "- Admin: Manage platform-wide users, permissions, and operational controls.",
      "",
      "Access rules",
      "- Access to staff and admin areas is restricted to those roles.",
      "- If you see a permission error, your role may not include that area. Contact your admin to confirm access.",
    ].join("\n"),
  },
  {
    slug: "faq-guide",
    topicSlug: "faqs",
    title: "Frequently Asked Questions",
    summary: "Search and browse the full knowledge base by audience and workflow.",
    audience: "GENERAL",
    sortOrder: 1,
    body: [
      "The FAQ library is grouped into general, student, staff, and enterprise admin questions.",
      "",
      "Use it for quick answers on modules, projects, questionnaires, access, deadlines, and support processes.",
    ].join("\n"),
  },
  {
    slug: "support-guide",
    topicSlug: "support",
    title: "Support",
    summary: "Get in touch with the support team.",
    sortOrder: 1,
    body: [
      "Contact support",
      "- For access issues, data concerns, or account problems, contact support.",
      "- Support is available by email at support@teamfeedback.app.",
      "",
      "Report a bug / request a feature",
      "- Include what happened, expected behavior, and steps to reproduce.",
      "- Attach screenshots and your module or project context to help diagnose quickly.",
    ].join("\n"),
  },
];

const helpFaqGroups: SeedHelpFaqGroup[] = [
  {
    slug: "faq-general",
    topicSlug: "faqs",
    title: "General FAQs",
    audience: "GENERAL",
    sortOrder: 1,
  },
  {
    slug: "faq-students",
    topicSlug: "faqs",
    title: "Student FAQs",
    description: "Deadlines, submissions, and access to your workspace.",
    audience: "STUDENT",
    sortOrder: 2,
  },
  {
    slug: "faq-staff",
    topicSlug: "faqs",
    title: "Staff FAQs",
    description: "Teaching workflows, questionnaires, and analytics visibility.",
    sortOrder: 3,
  },
  {
    slug: "faq-enterprise-admin",
    topicSlug: "faqs",
    title: "Enterprise Admin FAQs",
    description: "Enterprise access and module management.",
    audience: "ENTERPRISE_ADMIN",
    sortOrder: 4,
  },
];

const helpFaqs: SeedHelpFaq[] = [
  {
    slug: "faq-general-access-missing-module",
    groupSlug: "faq-general",
    question: "I cannot access a module or project.",
    answer: "If a module or project is missing, contact your staff lead or workspace administrator for access.",
    sortOrder: 1,
  },
  {
    slug: "faq-general-support",
    groupSlug: "faq-general",
    question: "How do I get support?",
    answer: "Use the Contact support link on the Help page to email the support team.",
    sortOrder: 2,
  },
  {
    slug: "faq-general-reset-password",
    groupSlug: "faq-general",
    question: "How do I reset my password if I cannot log in?",
    answer: "Use the Forgot password option on the login page and follow the reset email instructions.",
    sortOrder: 3,
  },
  {
    slug: "faq-general-role-access",
    groupSlug: "faq-general",
    question: "Why cannot I see a module or project that my teammate can?",
    answer: "Access is role and enrollment based. If something is missing, ask your staff lead or admin to verify your assignment.",
    sortOrder: 4,
  },
  {
    slug: "faq-general-role-overview",
    groupSlug: "faq-general",
    question: "What do the different user roles allow?",
    answer: "Students can access their own team and submissions, staff can manage teaching workflows, and admins can manage platform-wide settings.",
    sortOrder: 5,
  },
  {
    slug: "faq-general-browsers",
    groupSlug: "faq-general",
    question: "What browsers and devices are supported?",
    answer: "The platform is designed for modern browsers on desktop and mobile. For best experience, use the latest Chrome, Edge, Firefox, or Safari.",
    sortOrder: 6,
  },
  {
    slug: "faq-general-report-bug",
    groupSlug: "faq-general",
    question: "Where can I report a bug or request a feature?",
    answer: "Use the Contact support button and include steps to reproduce, screenshots, and your module or project context.",
    sortOrder: 7,
  },
  {
    slug: "faq-general-data-storage",
    groupSlug: "faq-general",
    question: "How is my data stored and who can view it?",
    answer: "Your data is stored securely with role-based access controls so only authorized users can view relevant information.",
    sortOrder: 8,
  },
  {
    slug: "faq-general-archiving-gdpr",
    groupSlug: "faq-general",
    question: "How does data archiving and GDPR compliance work?",
    answer: "Every cycle is archived with audit trails. Data retention rules are configurable, and exports respect GDPR requirements.",
    sortOrder: 9,
  },
  {
    slug: "faq-student-update-profile",
    groupSlug: "faq-students",
    question: "How do I update my profile details?",
    answer: "Open your profile from the user menu, edit your details, then select Save changes.",
    sortOrder: 1,
  },
  {
    slug: "faq-student-anonymous-feedback",
    groupSlug: "faq-students",
    question: "Is peer feedback anonymous?",
    answer: "Yes. Peer feedback is currently always anonymous.",
    sortOrder: 2,
  },
  {
    slug: "faq-student-projects",
    groupSlug: "faq-students",
    question: "Where can I see my projects?",
    answer: "Go to Projects in the sidebar to view all projects you are assigned to.",
    sortOrder: 3,
    links: [{ label: "Open Projects", href: "/projects" }],
  },
  {
    slug: "faq-student-meetings",
    groupSlug: "faq-students",
    question: "How do I view my team's meeting schedule?",
    answer: "Open Projects, select your project, then go to Team meetings to see upcoming sessions and schedule new ones.",
    sortOrder: 4,
    links: [
      { label: "Open Projects", href: "/projects" },
      { label: "View Calendar", href: "/calendar" },
    ],
  },
  {
    slug: "faq-student-peer-assessment",
    groupSlug: "faq-students",
    question: "Where do I see my peer assessment?",
    answer: "Open your project and go to Peer Assessments to view your submissions and required reviews.",
    sortOrder: 5,
    links: [{ label: "Open Projects", href: "/projects" }],
  },
  {
    slug: "faq-student-team-invites",
    groupSlug: "faq-students",
    question: "How do I join a team if I'm not assigned?",
    answer: "If team invitations are enabled, you'll see invites in your project. Otherwise, contact your staff lead to be added.",
    sortOrder: 6,
  },
  {
    slug: "faq-student-edit-feedback",
    groupSlug: "faq-students",
    question: "Can I edit or delete a peer feedback submission after submitting?",
    answer: "This depends on your module settings. Some assessments allow edits before the deadline, while others lock immediately after submission.",
    sortOrder: 7,
  },
  {
    slug: "faq-student-late-submission",
    groupSlug: "faq-students",
    question: "What happens if a deadline passes before I submit?",
    answer: "Late submissions are controlled by your module rules. You may be locked out or flagged as late depending on staff configuration.",
    sortOrder: 8,
  },
  {
    slug: "faq-staff-questionnaires",
    groupSlug: "faq-staff",
    question: "How do I create and schedule a questionnaire?",
    answer: "Go to Staff > Questionnaires to create or reuse a template, then apply it to a module or project when setting up assessments.",
    sortOrder: 1,
    links: [{ label: "Open Staff Questionnaires", href: "/staff/questionnaires" }],
  },
  {
    slug: "faq-staff-team-allocation",
    groupSlug: "faq-staff",
    question: "How do I manage team allocations?",
    answer: "Open Staff -> My Modules -> Projects, choose a project, then open Team allocation to review and adjust teams.",
    sortOrder: 2,
    links: [{ label: "Open My Modules", href: "/staff/modules" }],
  },
  {
    slug: "faq-staff-data-refresh",
    groupSlug: "faq-staff",
    question: "How often is project and team data refreshed?",
    answer: "Most workspace data updates after actions are saved. External integration data may refresh on scheduled syncs or manual refresh.",
    sortOrder: 3,
  },
  {
    slug: "faq-staff-export",
    groupSlug: "faq-staff",
    question: "Can I export feedback, marks, or attendance records?",
    answer: "Export availability depends on the feature and your permissions. Staff and admins typically have broader export access.",
    sortOrder: 4,
  },
  {
    slug: "faq-staff-custom-questionnaires",
    groupSlug: "faq-staff",
    question: "How does peer assessment work with custom questionnaires?",
    answer: "Pick a template, adjust scales and anonymity, schedule deadlines, and let students submit once while staff monitor progress.",
    sortOrder: 5,
  },
  {
    slug: "faq-staff-reuse-questionnaires",
    groupSlug: "faq-staff",
    question: "Can we reuse questionnaires across modules and years?",
    answer: "Yes. Save questionnaires to a shared library, version them, and reuse them across cohorts without rebuilding from scratch.",
    sortOrder: 6,
  },
  {
    slug: "faq-staff-github-data",
    groupSlug: "faq-staff",
    question: "What data do you pull from GitHub, and what do you not pull?",
    answer: "We ingest contribution metadata such as commits, pull requests, issues, and timestamps, and never tokens or repository secrets.",
    sortOrder: 7,
  },
  {
    slug: "faq-staff-team-forming",
    groupSlug: "faq-staff",
    question: "Can teams self-form or be auto-allocated?",
    answer: "Both. Let coordinators auto-allocate by module rules or allow students to self-select into teams with approvals.",
    sortOrder: 8,
  },
  {
    slug: "faq-staff-role-permissions",
    groupSlug: "faq-staff",
    question: "How do roles and permissions work?",
    answer: "Grant read-only or edit access per data type so supervisors, TAs, and students only see what they should.",
    sortOrder: 9,
  },
  {
    slug: "faq-enterprise-access",
    groupSlug: "faq-enterprise-admin",
    question: "How do I access the enterprise admin area?",
    answer: "Use the Enterprise space in the top bar to open enterprise management.",
    sortOrder: 1,
    links: [{ label: "Open Enterprise", href: "/enterprise" }],
  },
  {
    slug: "faq-enterprise-modules",
    groupSlug: "faq-enterprise-admin",
    question: "How do I manage enterprise modules?",
    answer: "Open Enterprise > Module management to create or edit enterprise modules.",
    sortOrder: 2,
    links: [{ label: "Open Module Management", href: "/enterprise/modules" }],
  },
  {
    slug: "faq-enterprise-suspended",
    groupSlug: "faq-enterprise-admin",
    question: 'Why am I seeing "Account suspended"?',
    answer: "Your account was suspended by an administrator. Contact support or your admin to restore access.",
    sortOrder: 3,
  },
  {
    slug: "faq-enterprise-out-of-date",
    groupSlug: "faq-enterprise-admin",
    question: "What should I do if data looks out of date?",
    answer: "Refresh the page first. If it persists, contact support with the module or project name.",
    sortOrder: 4,
  },
  {
    slug: "faq-enterprise-feature-flags",
    groupSlug: "faq-enterprise-admin",
    question: "How do I configure feature flags?",
    answer: "Enterprise admins and admins can enable or disable feature flags from Enterprise > Feature flags.",
    sortOrder: 5,
  },
  {
    slug: "faq-enterprise-enterprises",
    groupSlug: "faq-enterprise-admin",
    question: "How do I add or remove an enterprise workspace?",
    answer: "Admins can manage enterprises in the Admin > Enterprises area.",
    sortOrder: 6,
  },
  {
    slug: "faq-enterprise-permissions",
    groupSlug: "faq-enterprise-admin",
    question: "How do I manage staff vs student permissions?",
    answer: "Admins can update user roles and access from the Admin > Users area.",
    sortOrder: 7,
  },
  {
    slug: "faq-enterprise-audit",
    groupSlug: "faq-enterprise-admin",
    question: "How do I audit changes or activity?",
    answer: "Admins can open the Audit log in the Admin workspace to review activity and export records.",
    sortOrder: 8,
  },
];

export async function seedHelpContent() {
  return withSeedLogging("seedHelpContent", async () => {
    const topicIds = new Map<string, number>();
    const groupIds = new Map<string, number>();

    for (const topic of helpTopics) {
      const record = await prisma.helpTopic.upsert({
        where: { slug: topic.slug },
        update: {
          title: topic.title,
          description: topic.description ?? null,
          sortOrder: topic.sortOrder,
          published: true,
        },
        create: {
          slug: topic.slug,
          title: topic.title,
          description: topic.description ?? null,
          sortOrder: topic.sortOrder,
          published: true,
        },
        select: { id: true },
      });
      topicIds.set(topic.slug, record.id);
    }

    for (const article of helpArticles) {
      const topicId = topicIds.get(article.topicSlug);
      if (!topicId) throw new Error(`Missing help topic for article ${article.slug}`);
      await prisma.helpArticle.upsert({
        where: { slug: article.slug },
        update: {
          topicId,
          title: article.title,
          summary: article.summary ?? null,
          body: article.body,
          audience: article.audience ?? null,
          sortOrder: article.sortOrder,
          published: true,
        },
        create: {
          topicId,
          slug: article.slug,
          title: article.title,
          summary: article.summary ?? null,
          body: article.body,
          audience: article.audience ?? null,
          sortOrder: article.sortOrder,
          published: true,
        },
      });
    }

    for (const group of helpFaqGroups) {
      const topicId = topicIds.get(group.topicSlug);
      const record = await prisma.helpFaqGroup.upsert({
        where: { slug: group.slug },
        update: {
          topicId,
          title: group.title,
          description: group.description ?? null,
          audience: group.audience ?? null,
          sortOrder: group.sortOrder,
          published: true,
        },
        create: {
          topicId,
          slug: group.slug,
          title: group.title,
          description: group.description ?? null,
          audience: group.audience ?? null,
          sortOrder: group.sortOrder,
          published: true,
        },
        select: { id: true },
      });
      groupIds.set(group.slug, record.id);
    }

    for (const faq of helpFaqs) {
      const groupId = groupIds.get(faq.groupSlug);
      if (!groupId) throw new Error(`Missing FAQ group for ${faq.slug}`);
      await prisma.helpFaq.upsert({
        where: { slug: faq.slug },
        update: buildHelpFaqWrite(groupId, faq),
        create: {
          slug: faq.slug,
          ...buildHelpFaqWrite(groupId, faq),
        },
      });
    }

    return {
      value: undefined,
      rows: helpTopics.length + helpArticles.length + helpFaqGroups.length + helpFaqs.length,
      details: `topics=${helpTopics.length}; articles=${helpArticles.length}; faq groups=${helpFaqGroups.length}; faqs=${helpFaqs.length}`,
    };
  });
}

function buildHelpFaqWrite(groupId: number, faq: SeedHelpFaq) {
  const data: {
    groupId: number;
    question: string;
    answer: string;
    sortOrder: number;
    published: boolean;
    links?: Prisma.InputJsonValue;
  } = {
    groupId,
    question: faq.question,
    answer: faq.answer,
    sortOrder: faq.sortOrder,
    published: true,
  };

  if (faq.links) {
    data.links = faq.links as Prisma.InputJsonValue;
  }

  return data;
}
