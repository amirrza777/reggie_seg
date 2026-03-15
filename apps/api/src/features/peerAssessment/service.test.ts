import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  getTeammates: vi.fn(),
  createPeerAssessment: vi.fn(),
  getPeerAssessment: vi.fn(),
  updatePeerAssessment: vi.fn(),
  getTeammateAssessments: vi.fn(),
  getQuestionsForProject: vi.fn(),
  getPeerAssessmentById: vi.fn(),
  getProjectQuestionnaireTemplate: vi.fn(),
}));

const projectServiceMocks = vi.hoisted(() => ({
  fetchProjectDeadline: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  projectFindUnique: vi.fn(),
}));

vi.mock("./repo.js", () => ({
  getTeammates: repoMocks.getTeammates,
  createPeerAssessment: repoMocks.createPeerAssessment,
  getPeerAssessment: repoMocks.getPeerAssessment,
  updatePeerAssessment: repoMocks.updatePeerAssessment,
  getTeammateAssessments: repoMocks.getTeammateAssessments,
  getQuestionsForProject: repoMocks.getQuestionsForProject,
  getPeerAssessmentById: repoMocks.getPeerAssessmentById,
  getProjectQuestionnaireTemplate: repoMocks.getProjectQuestionnaireTemplate,
}));

vi.mock("../projects/service.js", () => ({
  fetchProjectDeadline: projectServiceMocks.fetchProjectDeadline,
}));

vi.mock("../../shared/db.js", () => ({
  prisma: {
    project: {
      findUnique: prismaMocks.projectFindUnique,
    },
  },
}));

import {
  fetchAssessment,
  fetchAssessmentById,
  fetchProjectQuestionnaireTemplate,
  fetchQuestionsForProject,
  fetchTeammateAssessments,
  fetchTeammates,
  saveAssessment,
  updateAssessmentAnswers,
} from "./service.js";

describe("peerAssessment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.projectFindUnique.mockResolvedValue(null);
    projectServiceMocks.fetchProjectDeadline.mockResolvedValue({
      assessmentOpenDate: new Date("2026-03-01T09:00:00.000Z"),
      assessmentDueDate: new Date("2026-03-31T23:59:59.000Z"),
    });
  });

  it("fetchTeammates forwards to repo", async () => {
    const expected = [{ user: { id: 2 } }];
    repoMocks.getTeammates.mockResolvedValue(expected);

    const result = await fetchTeammates(4, 1);

    expect(repoMocks.getTeammates).toHaveBeenCalledWith(4, 1);
    expect(result).toBe(expected);
  });

  it("saveAssessment forwards to repo", async () => {
    const payload = {
      projectId: 1,
      teamId: 2,
      reviewerUserId: 4,
      revieweeUserId: 5,
      templateId: 10,
      answersJson: [{ questionId: 1, answer: "Great work" }],
    };
    const expected = { id: 42 };
    repoMocks.createPeerAssessment.mockResolvedValue(expected);

    const result = await saveAssessment(payload);

    expect(repoMocks.createPeerAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        ...payload,
        submittedLate: false,
        effectiveDueDate: new Date("2026-03-31T23:59:59.000Z"),
      }),
    );
    expect(result).toBe(expected);
  });

  it("saveAssessment blocks archived project", async () => {
    const payload = {
      projectId: 1,
      teamId: 2,
      reviewerUserId: 4,
      revieweeUserId: 5,
      templateId: 10,
      answersJson: [{ questionId: 1, answer: "Great work" }],
    };
    prismaMocks.projectFindUnique.mockResolvedValue({ archivedAt: new Date() });

    await expect(saveAssessment(payload)).rejects.toMatchObject({ code: "PROJECT_ARCHIVED" });
    expect(repoMocks.createPeerAssessment).not.toHaveBeenCalled();
  });

  it("saveAssessment blocks submissions before assessment open", async () => {
    const payload = {
      projectId: 1,
      teamId: 2,
      reviewerUserId: 4,
      revieweeUserId: 5,
      templateId: 10,
      answersJson: [{ questionId: 1, answer: "Great work" }],
    };
    projectServiceMocks.fetchProjectDeadline.mockResolvedValue({
      assessmentOpenDate: new Date("3026-03-01T09:00:00.000Z"),
      assessmentDueDate: new Date("3026-03-31T23:59:59.000Z"),
    });

    await expect(saveAssessment(payload)).rejects.toMatchObject({ code: "ASSESSMENT_WINDOW_NOT_OPEN" });
    expect(repoMocks.createPeerAssessment).not.toHaveBeenCalled();
  });

  it("saveAssessment allows late submissions and marks them", async () => {
    const payload = {
      projectId: 1,
      teamId: 2,
      reviewerUserId: 4,
      revieweeUserId: 5,
      templateId: 10,
      answersJson: [{ questionId: 1, answer: "Great work" }],
    };
    projectServiceMocks.fetchProjectDeadline.mockResolvedValue({
      assessmentOpenDate: new Date("2020-03-01T09:00:00.000Z"),
      assessmentDueDate: new Date("2020-03-31T23:59:59.000Z"),
    });
    repoMocks.createPeerAssessment.mockResolvedValue({ id: 99 });

    await expect(saveAssessment(payload)).resolves.toEqual({ id: 99 });
    expect(repoMocks.createPeerAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        ...payload,
        submittedLate: true,
        effectiveDueDate: new Date("2020-03-31T23:59:59.000Z"),
      }),
    );
  });

  it("fetchAssessment forwards to repo", async () => {
    const expected = { id: 11 };
    repoMocks.getPeerAssessment.mockResolvedValue(expected);

    const result = await fetchAssessment(1, 2, 4, 5);

    expect(repoMocks.getPeerAssessment).toHaveBeenCalledWith(1, 2, 4, 5);
    expect(result).toBe(expected);
  });

  it("updateAssessmentAnswers forwards to repo", async () => {
    const answers = [{ questionId: 1, answer: "Updated" }];
    const expected = { id: 11 };
    repoMocks.getPeerAssessmentById.mockResolvedValue({
      id: 11,
      projectId: 1,
      reviewerUserId: 4,
      submittedLate: false,
    });
    repoMocks.updatePeerAssessment.mockResolvedValue(expected);

    const result = await updateAssessmentAnswers(11, answers);

    expect(repoMocks.updatePeerAssessment).toHaveBeenCalledWith(
      11,
      answers,
      expect.objectContaining({
        submittedLate: false,
        effectiveDueDate: new Date("2026-03-31T23:59:59.000Z"),
      }),
    );
    expect(result).toBe(expected);
  });

  it("updateAssessmentAnswers keeps late flag once deadline has passed", async () => {
    repoMocks.getPeerAssessmentById.mockResolvedValue({
      id: 12,
      projectId: 1,
      reviewerUserId: 4,
      submittedLate: false,
    });
    projectServiceMocks.fetchProjectDeadline.mockResolvedValue({
      assessmentOpenDate: new Date("2020-03-01T09:00:00.000Z"),
      assessmentDueDate: new Date("2020-03-31T23:59:59.000Z"),
    });
    repoMocks.updatePeerAssessment.mockResolvedValue({ id: 12 });

    await updateAssessmentAnswers(12, { 1: "Late edit" });

    expect(repoMocks.updatePeerAssessment).toHaveBeenCalledWith(
      12,
      { 1: "Late edit" },
      expect.objectContaining({
        submittedLate: true,
        effectiveDueDate: new Date("2020-03-31T23:59:59.000Z"),
      }),
    );
  });

  it("updateAssessmentAnswers returns P2025 when assessment cannot be found", async () => {
    repoMocks.getPeerAssessmentById.mockResolvedValue(null);

    await expect(updateAssessmentAnswers(999, [{ q: 1 }])).rejects.toMatchObject({ code: "P2025" });
    expect(repoMocks.updatePeerAssessment).not.toHaveBeenCalled();
  });

  it("fetchTeammateAssessments forwards to repo", async () => {
    const expected = [{ id: 1 }, { id: 2 }];
    repoMocks.getTeammateAssessments.mockResolvedValue(expected);

    const result = await fetchTeammateAssessments(4, 99);

    expect(repoMocks.getTeammateAssessments).toHaveBeenCalledWith(4, 99);
    expect(result).toBe(expected);
  });

  it("fetchQuestionsForProject forwards to repo", async () => {
    const expected = { questionnaireTemplate: { id: 3 } };
    repoMocks.getQuestionsForProject.mockResolvedValue(expected);

    const result = await fetchQuestionsForProject(99);

    expect(repoMocks.getQuestionsForProject).toHaveBeenCalledWith(99);
    expect(result).toBe(expected);
  });

  it("fetchAssessmentById forwards to repo", async () => {
    const expected = { id: 77 };
    repoMocks.getPeerAssessmentById.mockResolvedValue(expected);

    const result = await fetchAssessmentById(77);

    expect(repoMocks.getPeerAssessmentById).toHaveBeenCalledWith(77);
    expect(result).toBe(expected);
  });

  it("fetchProjectQuestionnaireTemplate forwards to repo", async () => {
    const expected = { questionnaireTemplate: { id: 3 } };
    repoMocks.getProjectQuestionnaireTemplate.mockResolvedValue(expected);

    const result = await fetchProjectQuestionnaireTemplate(55);

    expect(repoMocks.getProjectQuestionnaireTemplate).toHaveBeenCalledWith(55);
    expect(result).toBe(expected);
  });
});
