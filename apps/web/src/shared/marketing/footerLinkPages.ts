export type FooterLinkCategory = "product" | "resources" | "integrations";

export type FooterLinkPagePoint = {
  title: string;
  body: string;
};

export type FooterLinkPageContent = {
  slug: string;
  label: string;
  title: string;
  description: string;
  points: FooterLinkPagePoint[];
  primaryCtaLabel: string;
  primaryCtaHref: string;
};

type FooterLinkPageMap = Record<FooterLinkCategory, Record<string, FooterLinkPageContent>>;

const footerLinkPages: FooterLinkPageMap = {
  product: {
    "peer-assessment": {
      slug: "peer-assessment",
      label: "Peer assessment",
      title: "Peer assessment that teams actually complete",
      description:
        "Launch clear review cycles, keep scoring criteria consistent, and deliver feedback without manual spreadsheet cleanup.",
      points: [
        { title: "Structured cycles", body: "Open and close each review window with clear deadlines and reminders." },
        { title: "Consistent criteria", body: "Apply shared rubrics so every team is evaluated against the same standards." },
        { title: "Actionable results", body: "Turn responses into practical insights staff and students can act on quickly." },
      ],
      primaryCtaLabel: "Start a peer assessment",
      primaryCtaHref: "/register",
    },
    questionnaires: {
      slug: "questionnaires",
      label: "Questionnaires",
      title: "Questionnaires built for repeatable team check-ins",
      description:
        "Create reusable forms for reflection, progress updates, and team health so each module keeps a consistent process.",
      points: [
        { title: "Reusable templates", body: "Save common question sets and run them again across cohorts." },
        { title: "Clear ownership", body: "Assign who submits, who reviews, and who gets alerted for each response." },
        { title: "Low admin overhead", body: "Collect responses in one place instead of chasing updates in multiple tools." },
      ],
      primaryCtaLabel: "Create a questionnaire",
      primaryCtaHref: "/register",
    },
    meetings: {
      slug: "meetings",
      label: "Meetings",
      title: "Meeting tracking that keeps teams accountable",
      description:
        "Plan recurring meetings, track attendance, and capture outcomes so project conversations are visible and measurable.",
      points: [
        { title: "Simple scheduling", body: "Set meetings quickly and keep everyone aligned on timing." },
        { title: "Attendance records", body: "Log participation trends without maintaining separate trackers." },
        { title: "Follow-up visibility", body: "Store outcomes and next steps with the rest of project activity." },
      ],
      primaryCtaLabel: "Plan team meetings",
      primaryCtaHref: "/register",
    },
    integrations: {
      slug: "integrations",
      label: "Integrations",
      title: "Integrations that tie activity to learning outcomes",
      description:
        "Connect delivery tools to your project workflow so progress signals, feedback cycles, and team operations stay aligned.",
      points: [
        { title: "Tool connectivity", body: "Link core platforms your teams already use day-to-day." },
        { title: "Unified context", body: "Bring activity, assessment, and coordination into one workflow." },
        { title: "Fewer handoffs", body: "Reduce manual status updates between supervisors and teams." },
      ],
      primaryCtaLabel: "Explore integrations",
      primaryCtaHref: "/integrations/github",
    },
    "roles-and-permissions": {
      slug: "roles-and-permissions",
      label: "Roles and permissions",
      title: "Role controls that fit staff and student workflows",
      description:
        "Define who can create, review, and manage project data with role-based permissions built for academic team structures.",
      points: [
        { title: "Role-based access", body: "Separate staff controls from student actions without custom setup." },
        { title: "Safer operations", body: "Prevent accidental edits to sensitive workflow settings." },
        { title: "Clear responsibility", body: "Make ownership explicit across modules, teams, and review cycles." },
      ],
      primaryCtaLabel: "Review access model",
      primaryCtaHref: "/help/roles-permissions",
    },
    analytics: {
      slug: "analytics",
      label: "Analytics",
      title: "Analytics for project health, participation, and delivery",
      description:
        "Monitor engagement trends, identify teams needing support, and track outcomes across modules with one dashboard.",
      points: [
        { title: "Participation trends", body: "See response and attendance patterns before they become risks." },
        { title: "Team-level signals", body: "Surface where collaboration quality is improving or drifting." },
        { title: "Module reporting", body: "Support reviews with clear data instead of manual summaries." },
      ],
      primaryCtaLabel: "View analytics capabilities",
      primaryCtaHref: "/register",
    },
  },
  resources: {
    guides: {
      slug: "guides",
      label: "Guides",
      title: "Guides for running smoother team-based modules",
      description:
        "Use short implementation guides for launching feedback cycles, structuring check-ins, and improving completion rates.",
      points: [
        { title: "Quick setup playbooks", body: "Start from practical steps instead of blank-page planning." },
        { title: "Role-specific advice", body: "Find guidance tailored for staff leads and module coordinators." },
        { title: "Operational checklists", body: "Keep each cycle consistent from kickoff to review." },
      ],
      primaryCtaLabel: "Open help guides",
      primaryCtaHref: "/help/getting-started",
    },
    templates: {
      slug: "templates",
      label: "Templates",
      title: "Templates for faster rollout and consistent delivery",
      description:
        "Start from ready-made structures for questionnaires, feedback windows, and meeting rhythms across teams.",
      points: [
        { title: "Starter formats", body: "Use default templates and adapt them to your module needs." },
        { title: "Consistent execution", body: "Keep process quality stable between terms and cohorts." },
        { title: "Less repetitive setup", body: "Reuse what works instead of rebuilding each cycle from scratch." },
      ],
      primaryCtaLabel: "Browse templates",
      primaryCtaHref: "/register",
    },
    faq: {
      slug: "faq",
      label: "FAQ",
      title: "Answers to common questions from staff and students",
      description:
        "Find concise answers on workflows, account access, integrations, and rollout decisions before your next cycle starts.",
      points: [
        { title: "Platform basics", body: "Understand what each workflow supports and when to use it." },
        { title: "Access and setup", body: "Resolve common onboarding and permissions questions quickly." },
        { title: "Operational clarity", body: "Get practical answers for recurring delivery questions." },
      ],
      primaryCtaLabel: "Read the FAQ",
      primaryCtaHref: "/help/faqs",
    },
  },
  integrations: {
    github: {
      slug: "github",
      label: "GitHub",
      title: "GitHub integration for contribution visibility",
      description:
        "Connect repositories to surface contribution patterns alongside feedback and team coordination activity.",
      points: [
        { title: "Repository linking", body: "Connect projects once and keep contribution data synced." },
        { title: "Delivery context", body: "View coding activity as part of broader team performance signals." },
        { title: "Better interventions", body: "Spot teams that need support earlier in the delivery cycle." },
      ],
      primaryCtaLabel: "Connect GitHub",
      primaryCtaHref: "/register",
    },
    trello: {
      slug: "trello",
      label: "Trello",
      title: "Trello integration for board and progress alignment",
      description:
        "Bring board-level progress into Team Feedback so planning and delivery signals sit alongside assessment workflows.",
      points: [
        { title: "Board sync", body: "Connect Trello boards to reflect active team progress." },
        { title: "Shared project view", body: "Pair task movement with meeting and feedback context." },
        { title: "Fewer status chases", body: "Reduce manual update requests across stakeholders." },
      ],
      primaryCtaLabel: "Connect Trello",
      primaryCtaHref: "/register",
    },
    vle: {
      slug: "vle",
      label: "VLE (placeholder)",
      title: "VLE integration planning and rollout direction",
      description:
        "Prepare for virtual learning environment connectivity with a clear plan for data flow, roles, and governance.",
      points: [
        { title: "Integration readiness", body: "Define what data should sync and who should manage it." },
        { title: "Process alignment", body: "Map VLE flows to existing module and team workflows." },
        { title: "Incremental rollout", body: "Introduce connectivity safely without disrupting current delivery." },
      ],
      primaryCtaLabel: "Discuss VLE setup",
      primaryCtaHref: "/help/support",
    },
  },
};

export function getFooterLinkPage(category: FooterLinkCategory, slug: string): FooterLinkPageContent | null {
  return footerLinkPages[category][slug] ?? null;
}

export function listFooterLinkParams() {
  const categories = Object.entries(footerLinkPages) as [FooterLinkCategory, Record<string, FooterLinkPageContent>][];
  return categories.flatMap(([category, pages]) => Object.keys(pages).map((slug) => ({ category, slug })));
}
