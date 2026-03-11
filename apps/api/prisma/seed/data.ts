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

export const userData = [...randomStaff, ...randomStudents];

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

export const projectData = Array.from({ length: SEED_PROJECT_COUNT }, (_, index) => {
  const module = moduleData[index % moduleData.length];
  const cycle = Math.floor(index / moduleData.length) + 1;
  return {
    name: `${module.name} Project ${cycle}`,
    moduleIndex: index % moduleData.length,
  };
});

export const teamData = projectData.flatMap((project, projectIndex) =>
  Array.from({ length: SEED_TEAMS_PER_PROJECT }, (_, teamIndex) => ({
    teamName: `${project.name} Team ${teamIndex + 1}`,
    projectIndex,
  }))
);
