import { randFirstName, randLastName, randSentence } from "@ngneat/falso";
import {
  SEED_MODULE_COUNT,
  SEED_PROJECT_COUNT,
  SEED_QUESTIONS_PER_TEMPLATE,
  SEED_STAFF_COUNT,
  SEED_STUDENT_COUNT,
  SEED_TEAMS_PER_PROJECT,
  SEED_TEMPLATE_COUNT,
} from "./volumes";

const randomStudents = Array.from({ length: SEED_STUDENT_COUNT }, (_, index) => {
  const firstName = randFirstName();
  const lastName = randLastName();

  return {
    firstName,
    lastName,
    email: `student${index + 1}@example.com`,
    role: "STUDENT" as const,
  };
});

const randomStaff = Array.from({ length: SEED_STAFF_COUNT }, (_, index) => {
  const firstName = randFirstName();
  const lastName = randLastName();

  return {
    firstName,
    lastName,
    email: `staff${index + 1}@example.com`,
    role: "STAFF" as const,
  };
});

const specialMarkerUsers = [
  {
    firstName: "Assessment",
    lastName: "Staff",
    email: "staff.assessment@example.com",
    role: "STAFF" as const,
  },
  {
    firstName: "Assessment",
    lastName: "Enterprise Admin",
    email: "entp_admin.assessment@example.com",
    role: "ENTERPRISE_ADMIN" as const,
  },
  {
    firstName: "Assessment",
    lastName: "Student",
    email: "student.assessment@example.com",
    role: "STUDENT" as const,
  },
  {
    firstName: "Assessment",
    lastName: "Global Admin",
    email: "global_admin.assessment@example.com",
    role: "ADMIN" as const,
  },
];

export const seedMarkerUserData = specialMarkerUsers;
export const userData = [...specialMarkerUsers, ...randomStaff, ...randomStudents];
export const seedAssessmentStudentEmail = "student.assessment@example.com";

const baseModuleNames = [
  "Software Engineering Group Project",
  "Database Systems",
  "Data Structures",
  "Foundations of Computing",
  "Elementary Logic with Applications",
  "Internet Systems",
];

export const moduleData = Array.from({ length: SEED_MODULE_COUNT }, (_, index) => {
  const baseName = baseModuleNames[index % baseModuleNames.length];
  const cycle = Math.floor(index / baseModuleNames.length);
  return { name: cycle === 0 ? baseName : `${baseName} ${cycle + 1}` };
});

function randomQuestionLabel() {
  const generated = randSentence();
  const sentence = (Array.isArray(generated) ? generated[0] : generated).replace(/\s+/g, " ").trim();
  const withoutTrailingPunctuation = sentence.replace(/[.?!]+$/, "");
  const maxLabelLength = 120;
  const trimmed = withoutTrailingPunctuation.slice(0, maxLabelLength - 1).trim();
  const safeLabel = trimmed.length > 0 ? trimmed : "Random question";
  return `${safeLabel}?`;
}

const baseTemplateNames = [
  "Default Peer Assessment Template",
  "Sprint Retrospective Template",
  "Presentation Readiness Template",
  "Repository Contribution Template",
  "End of Module Review Template",
];

export const questionnaireTemplateData = Array.from({ length: SEED_TEMPLATE_COUNT }, (_, index) => {
  const baseName = baseTemplateNames[index % baseTemplateNames.length];
  const cycle = Math.floor(index / baseTemplateNames.length);
  return {
    templateName: cycle === 0 ? baseName : `${baseName} ${cycle + 1}`,
    isPublic: true,
    questions: Array.from({ length: SEED_QUESTIONS_PER_TEMPLATE }, () => randomQuestionLabel()),
  };
});

const usedProjectAliases = new Set<string>();

function randomProjectAlias(index: number) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const generated = randSentence({ length: { min: 2, max: 4 } });
    const raw = Array.isArray(generated) ? generated[0] : generated;
    const sentence = typeof raw === "string" ? raw.replace(/[.?!]+$/g, "").trim() : "";
    const sentenceToken = sentence
      .split(/\s+/)
      .map((part) => part.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .find((part) => part.length >= 4);
    const nameToken = `${randFirstName()}${randLastName()}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const token = sentenceToken || nameToken;
    if (!token || token.length < 4) continue;
    if (usedProjectAliases.has(token)) continue;
    usedProjectAliases.add(token);
    return token;
  }

  const forcedToken = `${randFirstName()}${randLastName()}${index + 1}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  usedProjectAliases.add(forcedToken);
  return forcedToken;
}

export const projectData = Array.from({ length: SEED_PROJECT_COUNT }, (_, index) => {
  const module = moduleData[index % moduleData.length];
  const cycle = Math.floor(index / moduleData.length) + 1;
  const alias = randomProjectAlias(index);
  const projectName = cycle === 1 ? `Project "${alias}"` : `Project "${alias}_${cycle}"`;
  const longProjectInformationText = [
    `${projectName} is a collaborative delivery project where your team is expected to plan, implement, review, and improve a complete solution over multiple milestones.`,
    "You should define clear roles early, keep responsibilities transparent, and maintain regular communication so blockers are identified quickly and resolved before they impact delivery.",
    "Use repository history, meeting notes, and peer feedback to evidence contributions and reflect on progress across each stage of the project lifecycle.",
    "Teams are expected to demonstrate consistent technical progress, thoughtful decision-making, and professional collaboration practices including attendance, preparation, and constructive review behaviour.",
    "Treat each deadline as a checkpoint for quality, not just completion: document design choices, justify trade-offs, and keep your implementation maintainable and testable.",
    "By the end of this project, you should be able to present a coherent delivery narrative covering planning, execution, quality assurance, teamwork, and lessons learned for future iterations.",
  ].join(" ");

  return {
    name: projectName,
    informationText: longProjectInformationText,
    moduleIndex: index % moduleData.length,
  };
});

export const teamData = projectData.flatMap((project, projectIndex) =>
  Array.from({ length: SEED_TEAMS_PER_PROJECT }, (_, teamIndex) => ({
    teamName: `${project.name} Team ${teamIndex + 1}`,
    projectIndex,
  }))
);
