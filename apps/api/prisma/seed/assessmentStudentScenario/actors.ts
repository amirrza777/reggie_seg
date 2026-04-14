import { Role } from "@prisma/client";
import { seedAssessmentStudentEmail } from "../data";
import type { SeedContext, SeedUser } from "../types";

export type AssessmentStudentActors = {
  assessmentStudent: SeedUser;
  marker: SeedUser;
  teammates: SeedUser[];
  memberIds: number[];
};

export function resolveAssessmentStudentActors(context: SeedContext): AssessmentStudentActors | null {
  const assessmentStudent = findAssessmentStudent(context);
  const marker = context.usersByRole.adminOrStaff[0];
  if (!assessmentStudent || !marker) return null;

  const teammates = context.standardUsers
    .filter((user) => user.role === Role.STUDENT && user.id !== assessmentStudent.id)
    .slice(0, 4);
  if (teammates.length < 2) return null;

  return {
    assessmentStudent,
    marker,
    teammates,
    memberIds: [assessmentStudent.id, ...teammates.map((user) => user.id)],
  };
}

function findAssessmentStudent(context: SeedContext) {
  const email = seedAssessmentStudentEmail.toLowerCase();
  return [...context.assessmentAccounts, ...context.users].find(
    (user) => user.role === Role.STUDENT && user.email.toLowerCase() === email,
  );
}
