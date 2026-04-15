import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    module: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    moduleLead: { createMany: vi.fn() },
    project: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    projectDeadline: { upsert: vi.fn() },
    team: { upsert: vi.fn() },
    teamAllocation: { deleteMany: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    userModule: { createMany: vi.fn() },
    question: { findMany: vi.fn() },
    meeting: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    meetingAttendance: { upsert: vi.fn() },
    meetingMinutes: { upsert: vi.fn() },
    meetingComment: { deleteMany: vi.fn(), create: vi.fn() },
    mention: { upsert: vi.fn() },
    peerFeedback: { deleteMany: vi.fn(), create: vi.fn() },
    peerAssessment: { deleteMany: vi.fn(), create: vi.fn() },
    staffStudentMarking: { deleteMany: vi.fn(), upsert: vi.fn() },
    staffTeamMarking: { deleteMany: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import {
  ASSESSMENT_STUDENT_MODULE_NAMES,
  ASSESSMENT_STUDENT_PROJECTS,
  seedAssessmentStudentScenario,
} from "../../../prisma/seed/assessmentStudentScenario";
import { resolveAssessmentStudentActors } from "../../../prisma/seed/assessmentStudentScenario/actors";
import { seedAssessmentStudentMarks } from "../../../prisma/seed/assessmentStudentScenario/marks";
import { seedAssessmentStudentMeetings } from "../../../prisma/seed/assessmentStudentScenario/meetings";
import { syncAssessmentStudentTeamMembers } from "../../../prisma/seed/assessmentStudentScenario/membership";
import { ensureAssessmentStudentModules, ensureAssessmentStudentProjects } from "../../../prisma/seed/assessmentStudentScenario/setup";
import type { SeedContext, SeedUser } from "../../../prisma/seed/types";

function buildUser(id: number, role: SeedUser["role"], email: string): SeedUser {
  return { id, role, email, firstName: `User${id}`, lastName: "Seed" };
}

function buildContext(): SeedContext {
  const assessmentStudent = buildUser(10, "STUDENT", "student.assessment@example.com");
  const assessmentStaff = buildUser(11, "STAFF", "staff.assessment@example.com");
  const staff = buildUser(20, "STAFF", "staff1@example.com");
  const students = [1, 2, 3, 4].map((id) => buildUser(id, "STUDENT", `student${id}@example.com`));
  return {
    enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
    passwordHash: "hash",
    users: [assessmentStudent, assessmentStaff, staff, ...students],
    standardUsers: [staff, ...students],
    assessmentAccounts: [assessmentStudent, assessmentStaff],
    usersByRole: { adminOrStaff: [staff], students },
    modules: [],
    templates: [{ id: 30, questionLabels: ["Contribution", "Communication"] }],
    projects: [],
    teams: [],
  };
}

function setupPrismaMocks() {
  let moduleId = 100;
  let projectId = 200;
  let teamId = 300;
  let meetingId = 400;
  let commentId = 500;
  let assessmentId = 600;

  prismaMock.module.findFirst.mockResolvedValue(null);
  prismaMock.module.create.mockImplementation(async () => ({ id: moduleId++ }));
  prismaMock.module.update.mockImplementation(async ({ where }: { where: { id: number } }) => ({ id: where.id }));
  prismaMock.moduleLead.createMany.mockImplementation(async ({ data }) => ({ count: data.length }));
  prismaMock.userModule.createMany.mockImplementation(async ({ data }) => ({ count: data.length }));
  prismaMock.project.findFirst.mockResolvedValue(null);
  prismaMock.project.create.mockImplementation(async () => ({ id: projectId++ }));
  prismaMock.project.update.mockImplementation(async ({ where }: { where: { id: number } }) => ({ id: where.id }));
  prismaMock.team.upsert.mockImplementation(async () => ({ id: teamId++ }));
  prismaMock.teamAllocation.findMany.mockResolvedValue([]);
  prismaMock.teamAllocation.createMany.mockImplementation(async ({ data }) => ({ count: data.length }));
  prismaMock.question.findMany.mockResolvedValue([]);
  prismaMock.meeting.findFirst.mockResolvedValue(null);
  prismaMock.meeting.create.mockImplementation(async () => ({ id: meetingId++ }));
  prismaMock.meeting.findMany.mockImplementation(async ({ where }) => [
    { id: where.teamId * 10 + 1, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { id: where.teamId * 10 + 2, date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
  ]);
  prismaMock.meetingComment.create.mockImplementation(async () => ({ id: commentId++ }));
  prismaMock.peerAssessment.create.mockImplementation(async () => ({ id: assessmentId++ }));
  prismaMock.projectDeadline.upsert.mockResolvedValue({});
  prismaMock.meetingAttendance.upsert.mockResolvedValue({});
  prismaMock.meetingMinutes.upsert.mockResolvedValue({});
  prismaMock.mention.upsert.mockResolvedValue({});
  prismaMock.peerFeedback.create.mockResolvedValue({});
  prismaMock.staffStudentMarking.upsert.mockResolvedValue({});
  prismaMock.staffTeamMarking.upsert.mockResolvedValue({});
  prismaMock.teamAllocation.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.meetingComment.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.peerAssessment.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.peerFeedback.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.staffStudentMarking.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.staffTeamMarking.deleteMany.mockResolvedValue({ count: 0 });
}

describe("seedAssessmentStudentScenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaMocks();
  });

  it("defines two modules and three projects per module with scoped duplicate names", () => {
    expect(ASSESSMENT_STUDENT_MODULE_NAMES).toHaveLength(2);
    expect(ASSESSMENT_STUDENT_PROJECTS.filter((project) => project.moduleIndex === 0)).toHaveLength(3);
    expect(ASSESSMENT_STUDENT_PROJECTS.filter((project) => project.moduleIndex === 1)).toHaveLength(3);
    expect(ASSESSMENT_STUDENT_PROJECTS.filter((project) => project.name === "Demo Completed Project")).toHaveLength(2);
  });

  it("seeds scenario projects by moduleId and never allocates assessment admin accounts as students", async () => {
    await seedAssessmentStudentScenario(buildContext());

    expect(prismaMock.module.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.userModule.createMany).toHaveBeenCalledWith({
      data: [
        { enterpriseId: "ent-1", moduleId: 100, userId: 10 },
        { enterpriseId: "ent-1", moduleId: 101, userId: 10 },
        { enterpriseId: "ent-1", moduleId: 100, userId: 11 },
        { enterpriseId: "ent-1", moduleId: 101, userId: 11 },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.moduleLead.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 100, userId: 11 }, { moduleId: 101, userId: 11 }],
      skipDuplicates: true,
    });
    expect(prismaMock.project.create).toHaveBeenCalledTimes(6);
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ moduleId: expect.any(Number), name: "Demo Completed Project" }),
    }));
    expect(prismaMock.teamAllocation.createMany).toHaveBeenCalledTimes(6);
    expect(prismaMock.teamAllocation.createMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ userId: 20 })]) }),
    );
  });

  it("seeds meetings, comments, peer states, and marks according to project state", async () => {
    await seedAssessmentStudentScenario(buildContext());

    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalledTimes(6);
    expect(prismaMock.meeting.create).toHaveBeenCalledTimes(12);
    expect(prismaMock.meetingComment.create).toHaveBeenCalled();
    expect(prismaMock.mention.upsert).toHaveBeenCalled();
    expect(prismaMock.peerAssessment.create).toHaveBeenCalled();
    expect(prismaMock.peerFeedback.create).toHaveBeenCalled();
    expect(prismaMock.staffTeamMarking.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.staffStudentMarking.upsert).toHaveBeenCalledTimes(10);
  });

  it("skips when the assessment student, marker, teammates, or template are missing", async () => {
    const context = { ...buildContext(), assessmentAccounts: [], templates: [] };
    const result = await seedAssessmentStudentScenario(context);

    expect(result).toBeUndefined();
    expect(prismaMock.module.create).not.toHaveBeenCalled();
  });

  it("falls back to student-only module membership when assessment staff account is missing", async () => {
    const context = buildContext();
    context.assessmentAccounts = context.assessmentAccounts.filter((user) => user.email !== "staff.assessment@example.com");
    context.users = context.users.filter((user) => user.email !== "staff.assessment@example.com");

    await seedAssessmentStudentScenario(context);

    expect(prismaMock.userModule.createMany).toHaveBeenCalledWith({
      data: [
        { enterpriseId: "ent-1", moduleId: 100, userId: 10 },
        { enterpriseId: "ent-1", moduleId: 101, userId: 10 },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.moduleLead.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 100, userId: 20 }, { moduleId: 101, userId: 20 }],
      skipDuplicates: true,
    });
  });

  it("covers actor guard when fewer than two teammates remain", () => {
    const context = buildContext();
    context.standardUsers = [buildUser(1, "STUDENT", "onlyone@example.com")];
    expect(resolveAssessmentStudentActors(context)).toBeNull();
  });

  it("covers setup branches for missing module index and update paths", async () => {
    prismaMock.module.findFirst.mockResolvedValue({ id: 100 });
    prismaMock.project.findFirst.mockResolvedValue({ id: 200 });

    const modules = await ensureAssessmentStudentModules({ id: "ent-1", code: "ENT", name: "Enterprise" });
    expect(modules).toHaveLength(2);
    expect(prismaMock.module.update).toHaveBeenCalled();

    const projects = await ensureAssessmentStudentProjects(
      "ent-1",
      [{ id: modules[0]!.id }],
      { id: 30, questionLabels: ["Q1"] },
    );
    expect(projects.length).toBeGreaterThan(0);
    expect(prismaMock.project.update).toHaveBeenCalled();
  });

  it("covers membership no-op branch when all team allocations already exist", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ userId: 10 }, { userId: 11 }]);
    const rows = await syncAssessmentStudentTeamMembers(
      [{ id: 1, moduleId: 1, templateId: 1, teamId: 99, teamName: "T", state: "assessment-open" }],
      [10, 11],
    );
    expect(rows).toBe(0);
  });

  it("covers meeting comment skip branch when author/mention is missing", async () => {
    prismaMock.meeting.findMany.mockResolvedValue([{ id: 500, date: new Date(Date.now() - 86_400_000) }]);
    const seeded = await seedAssessmentStudentMeetings(
      [{ id: 1, moduleId: 1, templateId: 1, teamId: 99, teamName: "T", state: "assessment-open" }],
      [1],
    );
    expect(seeded.comments).toBe(0);
    expect(seeded.mentions).toBe(0);
  });

  it("normalizes legacy [SEED] meeting titles for assessment student teams", async () => {
    prismaMock.meeting.findMany
      .mockResolvedValueOnce([{ id: 501, title: "[SEED] Assessment Student T Previous Meeting" }])
      .mockResolvedValueOnce([{ id: 500, date: new Date(Date.now() - 86_400_000) }]);
    await seedAssessmentStudentMeetings(
      [{ id: 1, moduleId: 1, templateId: 1, teamId: 99, teamName: "T", state: "assessment-open" }],
      [1, 2],
    );
    expect(prismaMock.meeting.update).toHaveBeenCalledWith({
      where: { id: 501 },
      data: { title: "Assessment Student T Previous Meeting" },
    });
  });

  it("covers marks skip branch for falsy student ids", async () => {
    const seeded = await seedAssessmentStudentMarks(
      [{ id: 1, moduleId: 1, templateId: 1, teamId: 77, teamName: "T", state: "completed-marked" }],
      [1, 0],
      20,
    );
    expect(seeded.teamMarks).toBe(1);
    expect(seeded.studentMarks).toBe(1);
  });
});
