export type LogoItem = { src: string; alt: string; width: number; height: number };
export type ToolkitCardItem = { title: string; body: string };
export type TestimonialItem = { quote: string; attribution: string; rating: number };
export type FaqItem = { question: string; answer: string };

export const marqueeLogos: LogoItem[] = [
  { src: "/marketing-logos/logo-1.png", alt: "Logo 1", width: 114, height: 110 },
  { src: "/marketing-logos/logo-2.png", alt: "Logo 2", width: 165, height: 110 },
  { src: "/marketing-logos/logo-3.png", alt: "Logo 3", width: 320, height: 88 },
  { src: "/marketing-logos/logo-4.png", alt: "Logo 4", width: 150, height: 110 },
  { src: "/marketing-logos/logo-5.png", alt: "Logo 5", width: 150, height: 110 },
  { src: "/marketing-logos/logo-6.png", alt: "Logo 6", width: 150, height: 110 },
];

const buildMarqueeSet = (logos: LogoItem[], minCount = 20) => {
  if (!logos.length) return [];
  const repeated: LogoItem[] = [];
  while (repeated.length < minCount) {
    repeated.push(...logos);
  }
  return repeated;
};

export const marqueeSets: LogoItem[][] = [buildMarqueeSet(marqueeLogos), buildMarqueeSet(marqueeLogos)];

export const toolkitCards: ToolkitCardItem[] = [
  {
    title: "Peer assessment that's fair",
    body: "Custom questionnaires, flexible scoring, anonymity options, staff visibility.",
  },
  {
    title: "Meetings that don't get lost",
    body: "Attendance, minutes, actions, and scheduling in one place.",
  },
  {
    title: "Contributions you can evidence",
    body: "GitHub-linked contribution insights per repo, per student, per sprint.",
  },
];

export const testimonials: TestimonialItem[] = [
  {
    quote: "Finally, everyone's contribution is visible, with evidence tied to every submission and meeting recap.",
    attribution: "PROJECT COORDINATOR",
    rating: 5,
  },
  {
    quote: "Setup takes minutes, and marking is faster now that scores, rubrics, and anonymized notes live in one place.",
    attribution: "TA / LECTURER",
    rating: 5,
  },
  {
    quote: "Meeting minutes and actions stopped disappearing, so our team actually follows up on what we commit to each week.",
    attribution: "STUDENT TEAM LEAD",
    rating: 5,
  },
  {
    quote: "The dashboard gives me confidence we won't miss a deadline and lets me spot struggling teams before they escalate.",
    attribution: "PROGRAMME LEAD",
    rating: 5,
  },
  {
    quote: "Peer reviews feel fairer with anonymity, saved templates, and quick exports for moderation when we need to step in.",
    attribution: "MODULE ADMIN",
    rating: 5,
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "How does peer assessment work with custom questionnaires?",
    answer:
      "Pick a template, adjust scales and anonymity, schedule deadlines, and let students submit once while staff monitor progress.",
  },
  {
    question: "Can we reuse questionnaires across modules and years?",
    answer:
      "Yes. Save questionnaires to a shared library, version them, and reuse them across cohorts without rebuilding from scratch.",
  },
  {
    question: "What data do you pull from GitHub, and what do you not pull?",
    answer:
      "We ingest contribution metadata (commits, PRs, issues, and timestamps) and never tokens or repository secrets.",
  },
  {
    question: "Can teams self-form or be auto-allocated?",
    answer:
      "Both. Let coordinators auto-allocate by module rules or allow students to self-select into teams with approvals.",
  },
  {
    question: "How do roles and permissions work?",
    answer:
      "Grant read-only or edit access per data type (questionnaires, submissions, actions, and analytics) so supervisors, TAs, and students only see what they should.",
  },
  {
    question: "How does data archiving and GDPR compliance work?",
    answer:
      "Every cycle is archived with audit trails. Data retention rules are configurable, and exports respect GDPR requirements.",
  },
];
