import { randFirstName, randLastName, randSentence } from "@ngneat/falso";

const generatedStudentCount = 180;
const generatedStaffCount = 17;
const teamsPerProject = 3;

const randomStudents = Array.from({ length: generatedStudentCount }, (_, index) => {
  const firstName = randFirstName();
  const lastName = randLastName();

  return {
    firstName,
    lastName,
    email: `student${index + 1}@example.com`,
    role: "STUDENT" as const,
  };
});

const randomStaff = Array.from({ length: generatedStaffCount }, (_, index) => {
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

export const moduleData = [
  { name: "Software Engineering Group Project" },
  { name: "Database Systems" },
  { name: "Data Structures" },
  { name: "Foundations of Computing" },
  { name: "Elementary Logic with Applications" },
  { name: "Internet Systems" },
];

function randomQuestionLabel() {
  const generated = randSentence();
  const sentence = (Array.isArray(generated) ? generated[0] : generated).replace(/\s+/g, " ").trim();
  const withoutTrailingPunctuation = sentence.replace(/[.?!]+$/, "");
  const maxLabelLength = 120;
  const trimmed = withoutTrailingPunctuation.slice(0, maxLabelLength - 1).trim();
  const safeLabel = trimmed.length > 0 ? trimmed : "Random question";
  return `${safeLabel}?`;
}

export const questionnaireTemplateData = [
  {
    templateName: "Default Peer Assessment Template",
    isPublic: true,
    questions: Array.from({ length: 5 }, () => randomQuestionLabel()),
  },
  {
    templateName: "Sprint Retrospective Template",
    isPublic: true,
    questions: Array.from({ length: 5 }, () => randomQuestionLabel()),
  },
  {
    templateName: "Presentation Readiness Template",
    isPublic: true,
    questions: Array.from({ length: 5 }, () => randomQuestionLabel()),
  },
  {
    templateName: "Repository Contribution Template",
    isPublic: true,
    questions: Array.from({ length: 5 }, () => randomQuestionLabel()),
  },
  {
    templateName: "End of Module Review Template",
    isPublic: true,
    questions: Array.from({ length: 5 }, () => randomQuestionLabel()),
  },
] as const;

export const projectData = Array.from({ length: 18 }, (_, index) => {
  const module = moduleData[index % moduleData.length];
  const cycle = Math.floor(index / moduleData.length) + 1;
  return {
    name: `${module.name} Project ${cycle}`,
    moduleIndex: index % moduleData.length,
  };
});

export const teamData = projectData.flatMap((project, projectIndex) =>
  Array.from({ length: teamsPerProject }, (_, teamIndex) => ({
    teamName: `${project.name} Team ${teamIndex + 1}`,
    projectIndex,
  }))
);
