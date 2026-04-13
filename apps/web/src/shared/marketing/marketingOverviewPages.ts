import type { MarketingOverviewPageContent } from "./MarketingOverviewPage";

export type MarketingOverviewSlug = "product" | "features" | "resources" | "about" | "faq";

const marketingOverviewPages: Record<MarketingOverviewSlug, MarketingOverviewPageContent> = {
  product: {
    slug: "product",
    eyebrow: "Product",
    title: "Everything needed to run structured group work",
    description:
      "Team Feedback brings peer assessment, reusable questionnaires, meetings, integrations, and monitoring into one workflow for students and staff.",
    primaryCtaLabel: "Try Team Feedback",
    primaryCtaHref: "/register",
    sectionTitle: "Core product areas",
    sectionDescription:
      "Browse the key parts of the platform and go deeper into the workflows your modules use most.",
    cards: [
      {
        title: "Peer assessment cycles",
        description: "Launch fair review windows with shared criteria, anonymity options, and clear deadlines.",
        href: "/product/peer-assessment",
        linkLabel: "View peer assessment",
      },
      {
        title: "Questionnaires and templates",
        description: "Create once, reuse across cohorts, and keep feedback quality consistent between terms.",
        href: "/product/questionnaires",
        linkLabel: "View questionnaires",
      },
      {
        title: "Meetings and follow-ups",
        description: "Track attendance, actions, and outcomes so teams stay accountable between checkpoints.",
        href: "/product/meetings",
        linkLabel: "View meetings",
      },
      {
        title: "Roles and permissions",
        description: "Control who can view, edit, and manage workflow data across staff and student roles.",
        href: "/product/roles-and-permissions",
        linkLabel: "View access controls",
      },
      {
        title: "Integrations",
        description: "Connect activity signals from linked tools to assessment and coordination workflows.",
        href: "/product/integrations",
        linkLabel: "View integrations",
      },
      {
        title: "Analytics and team health",
        description: "Spot risk early using attendance, participation, and contribution trends in one place.",
        href: "/product/analytics",
        linkLabel: "View analytics",
      },
    ],
    bottomCtaTitle: "Run cleaner project cycles",
    bottomCtaDescription:
      "Set up your next module with shared questionnaires, transparent team signals, and less admin overhead.",
    bottomCtaLabel: "Create an account",
    bottomCtaHref: "/register",
  },
  features: {
    slug: "features",
    eyebrow: "Features",
    title: "Features built for academic team delivery",
    description:
      "Move from scattered tools to one predictable process for peer feedback, meetings, progress tracking, and intervention support.",
    primaryCtaLabel: "Explore product pages",
    primaryCtaHref: "/product",
    sectionTitle: "What teams and staff use most",
    sectionDescription:
      "These capabilities are designed for day-to-day module operations, not one-off demos.",
    cards: [
      {
        title: "Custom scoring and anonymity",
        description: "Configure peer reviews that match your marking approach while keeping submissions manageable.",
        href: "/product/peer-assessment",
        linkLabel: "Open assessment features",
      },
      {
        title: "Reusable questionnaire library",
        description: "Build reusable forms for reflections, weekly check-ins, and cohort-wide feedback windows.",
        href: "/product/questionnaires",
        linkLabel: "Open questionnaire features",
      },
      {
        title: "Attendance and meeting minutes",
        description: "Keep evidence of meeting participation and outcomes without separate manual trackers.",
        href: "/product/meetings",
        linkLabel: "Open meeting features",
      },
      {
        title: "GitHub contribution insights",
        description: "Bring repository activity into team-level context for earlier and fairer staff interventions.",
        href: "/integrations/github",
        linkLabel: "Open GitHub integration",
      },
      {
        title: "Trello progress signals",
        description: "Pair board movement with team feedback and meeting context to reduce status-chasing.",
        href: "/integrations/trello",
        linkLabel: "Open Trello integration",
      },
      {
        title: "Monitoring and early warnings",
        description: "Track participation and team health trends to identify groups that need support sooner.",
        href: "/product/analytics",
        linkLabel: "Open monitoring features",
      },
    ],
    bottomCtaTitle: "See features in a real workflow",
    bottomCtaDescription:
      "Start with one module and expand as teams adopt the same repeatable process across assessments and meetings.",
    bottomCtaLabel: "Start on web",
    bottomCtaHref: "/register",
  },
  resources: {
    slug: "resources",
    eyebrow: "Resources",
    title: "Guidance and support for rollout and operations",
    description:
      "Use Team Feedback help resources to onboard staff, answer student questions, and keep each cycle running smoothly.",
    primaryCtaLabel: "Open help center",
    primaryCtaHref: "/help",
    sectionTitle: "Resource categories",
    sectionDescription: "Start with setup guides, then use role-based references and FAQs for day-to-day support.",
    cards: [
      {
        title: "Getting started guides",
        description: "Step-by-step setup for launching your first project cycle with clear defaults.",
        href: "/help/getting-started",
        linkLabel: "Read getting started",
      },
      {
        title: "FAQs",
        description: "Quick answers for platform workflows, integrations, and operational decisions.",
        href: "/help/faqs",
        linkLabel: "Read FAQs",
      },
      {
        title: "Account and access",
        description: "Fix common sign-in, access, and workspace switching problems.",
        href: "/help/account-access",
        linkLabel: "Read access help",
      },
      {
        title: "Roles and permissions",
        description: "Understand what staff, students, and admins can manage across the platform.",
        href: "/help/roles-permissions",
        linkLabel: "Read roles guide",
      },
      {
        title: "API support",
        description: "Review API usage patterns and integration guidance where available.",
        href: "/help/api",
        linkLabel: "Read API help",
      },
      {
        title: "Support contact",
        description: "Escalate setup blockers or platform issues with the support team.",
        href: "/help/support",
        linkLabel: "Open support options",
      },
    ],
    bottomCtaTitle: "Need rollout help?",
    bottomCtaDescription: "Use guides and support channels to keep your next cohort launch predictable.",
    bottomCtaLabel: "Contact support",
    bottomCtaHref: "/help/support",
  },
  about: {
    slug: "about",
    eyebrow: "About Team Feedback",
    title: "Built to make group project delivery fair and visible",
    description:
      "Team Feedback is an academic team management platform focused on peer assessment, meeting accountability, and contribution visibility.",
    primaryCtaLabel: "See product overview",
    primaryCtaHref: "/product",
    sectionTitle: "What the platform is designed for",
    sectionDescription:
      "The product focuses on operational reliability for students, staff, and programme teams running group-based modules.",
    cards: [
      {
        title: "Student-friendly workflows",
        description: "Students complete feedback and meeting actions in one place with clear deadlines and expectations.",
        href: "/product/peer-assessment",
        linkLabel: "See student workflows",
      },
      {
        title: "Staff visibility and control",
        description: "Staff can monitor progress, identify risk, and review evidence without spreadsheet handoffs.",
        href: "/product/analytics",
        linkLabel: "See staff visibility",
      },
      {
        title: "Role-based governance",
        description: "Permissions keep workflow ownership clear across staff, students, and administration roles.",
        href: "/product/roles-and-permissions",
        linkLabel: "See governance model",
      },
      {
        title: "Connected delivery context",
        description: "GitHub and Trello connections keep collaboration signals near assessment and meeting data.",
        href: "/product/integrations",
        linkLabel: "See connected tools",
      },
      {
        title: "Audit-ready records",
        description: "Archived cycles preserve feedback and activity history for moderation and review.",
        href: "/resources/guides",
        linkLabel: "See process guidance",
      },
      {
        title: "Practical rollout support",
        description: "Help resources cover setup, access, FAQs, and support paths for each stage of adoption.",
        href: "/resources",
        linkLabel: "See rollout resources",
      },
    ],
    bottomCtaTitle: "Run your next cohort with clearer signals",
    bottomCtaDescription:
      "Bring peer assessment, meetings, and contribution context together so interventions happen earlier.",
    bottomCtaLabel: "Try Team Feedback",
    bottomCtaHref: "/register",
  },
  faq: {
    slug: "faq",
    eyebrow: "FAQ",
    title: "Common questions before launch",
    description:
      "Find answers on setup, permissions, integrations, and day-to-day operations for Team Feedback modules.",
    primaryCtaLabel: "Read full FAQs",
    primaryCtaHref: "/help/faqs",
    sectionTitle: "Popular FAQ topics",
    sectionDescription: "Start with the topics below, then use the full Help Hub for deeper guidance.",
    cards: [
      {
        title: "Platform basics",
        description: "What Team Feedback covers and how workflows map to group project delivery.",
        href: "/resources/faq",
        linkLabel: "Open platform FAQs",
      },
      {
        title: "Access and onboarding",
        description: "Account setup, login issues, and workspace access for staff and students.",
        href: "/help/account-access",
        linkLabel: "Open access FAQs",
      },
      {
        title: "Roles and permissions",
        description: "Who can manage questionnaires, meetings, analytics, and project settings.",
        href: "/help/roles-permissions",
        linkLabel: "Open role FAQs",
      },
      {
        title: "Integrations",
        description: "What data GitHub and Trello integrations provide and where they appear.",
        href: "/integrations/github",
        linkLabel: "Open integration details",
      },
      {
        title: "Support paths",
        description: "When to use guides, FAQs, or direct support for unresolved issues.",
        href: "/help/support",
        linkLabel: "Open support guidance",
      },
      {
        title: "Help Hub",
        description: "Search all help topics across getting started, FAQs, and API guidance.",
        href: "/help",
        linkLabel: "Open Help Hub",
      },
    ],
    bottomCtaTitle: "Need help with something specific?",
    bottomCtaDescription: "Use the support channels when you need rollout advice or troubleshooting.",
    bottomCtaLabel: "Contact support",
    bottomCtaHref: "/help/support",
  },
};

export function getMarketingOverviewPage(slug: MarketingOverviewSlug): MarketingOverviewPageContent {
  return marketingOverviewPages[slug];
}

export function listMarketingOverviewSlugs(): MarketingOverviewSlug[] {
  return Object.keys(marketingOverviewPages) as MarketingOverviewSlug[];
}
