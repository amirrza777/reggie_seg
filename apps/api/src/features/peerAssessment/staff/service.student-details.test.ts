import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStudentDetailsIfLead } from "./service.js";

vi.mock("./repo.js", () => ({
  findModulesForStaff: vi.fn(),
  countSubmittedPAsForModule: vi.fn(),
  countStudentsInModule: vi.fn(),
  getModuleDetailsIfAuthorised: vi.fn(),
  findTeamsInModule: vi.fn(),
  countSubmittedPAsForTeam: vi.fn(),
  countStudentsInTeam: vi.fn(),
  findTeamByIdAndModule: vi.fn(),
  getTeamWithAssessments: vi.fn(),
  findAssessmentsForRevieweeInTeam: vi.fn(),
  findTemplateWithQuestions: vi.fn(),
  findTeamMarking: vi.fn(),
  findStudentMarking: vi.fn(),
  upsertTeamMarking: vi.fn(),
  upsertStudentMarking: vi.fn(),
  isStudentInTeam: vi.fn(),
}));

import * as repo from "./repo.js";

const mockRepo = vi.mocked(repo);

beforeEach(() => {
  vi.clearAllMocks();
});

const moduleLead = { id: 1, name: "Module A", archivedAt: null as Date | null };
const teamInModule = { id: 10, teamName: "Team 1" };
const twoMembers = [
  { id: 100, firstName: "Alice", lastName: "Smith" },
  { id: 101, firstName: "Bob", lastName: "Jones" },
];
const bobReviewer = { id: 101, firstName: "Bob", lastName: "Jones" };
const carolReviewer = { id: 102, firstName: "Carol", lastName: "Lee" };

function makeTemplate(questions: Array<{ id: number; label: string; order: number }>) {
  return { id: 10, questions };
}

function makeReview(params: {
  answersJson: unknown;
  reviewer?: { id: number; firstName: string; lastName: string };
  id?: number;
}) {
  const reviewer = params.reviewer ?? bobReviewer;
  return {
    id: params.id ?? 1,
    reviewerUserId: reviewer.id,
    answersJson: params.answersJson,
    templateId: 10,
    reviewer,
  };
}

async function getDefaultStudentDetails() {
  return getStudentDetailsIfLead(1, 1, 10, 100);
}

function setupSingleNumericReviewContext() {
  setupStudentDetailsContext({
    assessments: [{ reviewerUserId: 101, revieweeUserId: 100 }],
    reviews: [makeReview({ answersJson: { 1: 4, 2: 5 } })],
    template: makeTemplate([
      { id: 1, label: "Q1", order: 0 },
      { id: 2, label: "Q2", order: 1 },
    ]),
  });
}

function setupStudentDetailsContext(params: {
  members?: Array<any>;
  assessments?: Array<any>;
  reviews?: Array<any>;
  template?: any;
}) {
  mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
  mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
  mockRepo.getTeamWithAssessments.mockResolvedValue({
    members: params.members ?? twoMembers,
    assessments: params.assessments ?? [],
  });
  mockRepo.findAssessmentsForRevieweeInTeam.mockResolvedValue(params.reviews ?? []);
  mockRepo.findTemplateWithQuestions.mockResolvedValue(params.template ?? null);
}

describe("getStudentDetailsIfLead (level 4: student details)", () => {
  it("returns student info and team member review flags when reviews exist", async () => {
    setupSingleNumericReviewContext();
    const result = await getDefaultStudentDetails();
    expect(result).not.toBeNull();
    expect(result!.student).toEqual({ id: 100, firstName: "Alice", lastName: "Smith" });
    expect(result!.teamMembers).toHaveLength(1);
    expect(result!.teamMembers[0]).toEqual({
      id: 101,
      firstName: "Bob",
      lastName: "Jones",
      reviewedByCurrentStudent: false,
      reviewedCurrentStudent: true,
    });
  });

  it("returns performance summary values when reviews exist", async () => {
    setupSingleNumericReviewContext();
    const result = await getDefaultStudentDetails();
    expect(result!.performanceSummary.overallAverage).toBe(4.5);
    expect(result!.performanceSummary.totalReviews).toBe(1);
    expect(result!.performanceSummary.questionAverages).toHaveLength(2);
  });

  it.each([
    { scenario: "staff is not module lead", module: null, team: null, studentId: 100 },
    { scenario: "team is not in module", module: moduleLead, team: null, studentId: 100 },
    { scenario: "student is not in team", module: moduleLead, team: teamInModule, studentId: 999 },
  ])("returns null when $scenario", async ({ module, team, studentId }) => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(module);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(team);
    if (team) {
      mockRepo.getTeamWithAssessments.mockResolvedValue({ members: twoMembers, assessments: [] });
    }
    const result = module === null
      ? await getStudentDetailsIfLead(99, 1, 10, 100)
      : team === null
        ? await getStudentDetailsIfLead(1, 1, 999, 100)
        : await getStudentDetailsIfLead(1, 1, 10, studentId);
    expect(result).toBeNull();
  });

  it.each([
    {
      scenario: "no reviews: zeroed performance and correct teamMembers",
      reviews: [] as unknown[],
      template: undefined as { id: number; questions: { id: number; label: string; order: number }[] } | undefined,
      expectPerf: { overallAverage: 0, totalReviews: 0, questionAverages: [] },
      expectMember: { id: 101, firstName: "Bob", lastName: "Jones", reviewedByCurrentStudent: false, reviewedCurrentStudent: false },
    },
    {
      scenario: "template missing: zeroed performance summary",
      reviews: [
        {
          id: 1,
          reviewerUserId: 101,
          answersJson: {},
          templateId: 10,
          reviewer: { id: 101, firstName: "Bob", lastName: "Jones" },
        },
      ],
      template: undefined as { id: number; questions: { id: number; label: string; order: number }[] } | undefined,
      expectPerf: { overallAverage: 0, totalReviews: 0, questionAverages: [] },
      expectMember: undefined,
    },
  ])("$scenario", async ({ reviews, template, expectPerf, expectMember }) => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.getTeamWithAssessments.mockResolvedValue({ members: twoMembers, assessments: [] });
    mockRepo.findAssessmentsForRevieweeInTeam.mockResolvedValue(
      reviews as Awaited<ReturnType<typeof repo.findAssessmentsForRevieweeInTeam>>
    );
    mockRepo.findTemplateWithQuestions.mockResolvedValue(template ?? null);

    const result = await getStudentDetailsIfLead(1, 1, 10, 100);

    expect(result!.performanceSummary).toEqual(expectPerf);
    if (expectMember) expect(result!.teamMembers[0]).toEqual(expectMember);
  });

  it("aggregates multiple reviewers and rounds averages correctly", async () => {
    setupStudentDetailsContext({
      members: [...twoMembers, { id: 102, firstName: "Carol", lastName: "Lee" }],
      reviews: [
        makeReview({ id: 1, reviewer: bobReviewer, answersJson: { 1: 3 } }),
        makeReview({ id: 2, reviewer: carolReviewer, answersJson: { 1: 5 } }),
      ],
      template: makeTemplate([{ id: 1, label: "Q1", order: 0 }]),
    });

    const result = await getDefaultStudentDetails();

    const q0 = result!.performanceSummary.questionAverages[0];
    expect(result!.performanceSummary.totalReviews).toBe(2);
    expect(q0?.averageScore).toBe(4);
    expect(q0?.totalReviews).toBe(2);
    expect(q0?.reviewerAnswers).toHaveLength(2);
  });

  it("parses scores from array-style answersJson payloads", async () => {
    setupStudentDetailsContext({
      reviews: [
        makeReview({
          answersJson: [
            { question: "1", answer: "4" },
            { question: "2", answer: "5" },
          ],
        }),
      ],
      template: makeTemplate([
        { id: 1, label: "Q1", order: 0 },
        { id: 2, label: "Q2", order: 1 },
      ]),
    });

    const result = await getDefaultStudentDetails();

    expect(result!.performanceSummary.overallAverage).toBe(4.5);
    expect(result!.performanceSummary.questionAverages[0]?.averageScore).toBe(4);
    expect(result!.performanceSummary.questionAverages[1]?.averageScore).toBe(5);
  });

  it("parses scores from array-style answersJson payloads with questionId keys", async () => {
    setupStudentDetailsContext({
      reviews: [
        makeReview({
          answersJson: [
            { questionId: 1, answer: "3" },
            { questionId: 2, answer: 4 },
          ],
        }),
      ],
      template: makeTemplate([
        { id: 1, label: "Q1", order: 0 },
        { id: 2, label: "Q2", order: 1 },
      ]),
    });

    const result = await getDefaultStudentDetails();

    expect(result!.performanceSummary.overallAverage).toBe(3.5);
    expect(result!.performanceSummary.questionAverages[0]?.averageScore).toBe(3);
    expect(result!.performanceSummary.questionAverages[1]?.averageScore).toBe(4);
  });

  it("excludes non-numeric answers from score averages", async () => {
    setupStudentDetailsContext({
      reviews: [
        makeReview({
          answersJson: [
            { question: "1", answer: "Great communication" },
            { question: "2", answer: 5 },
          ],
        }),
      ],
      template: makeTemplate([
        { id: 1, label: "Comment", order: 0 },
        { id: 2, label: "Teamwork", order: 1 },
      ]),
    });

    const result = await getDefaultStudentDetails();

    expect(result!.performanceSummary.overallAverage).toBe(5);
    expect(result!.performanceSummary.questionAverages).toHaveLength(1);
    expect(result!.performanceSummary.questionAverages[0]).toMatchObject({
      questionId: 2,
      questionText: "Teamwork",
      averageScore: 5,
      totalReviews: 1,
    });
  });
});
