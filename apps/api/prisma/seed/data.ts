import { randFirstName, randLastName } from "@ngneat/falso";

const generatedStudentCount = 5;
const generatedStaffCount = Math.ceil(generatedStudentCount / 10);

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

export const projectData = [
  { name: "Small Group Project", moduleIndex: 0 },
  { name: "Large Group Project", moduleIndex: 0 },
  { name: "Data Project", moduleIndex: 2 },
  { name: "Database Project", moduleIndex: 1 },
];

export const teamData = [
  { teamName: "Team Alpha", projectIndex: 0 },
  { teamName: "Team Beta", projectIndex: 0 },
  { teamName: "Team Beta", projectIndex: 1 },
  { teamName: "Team Gamma", projectIndex: 2 },
];
