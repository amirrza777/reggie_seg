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

    expect(repoMocks.createPeerAssessment).toHaveBeenCalledWith(payload);
    expect(result).toBe(expected);
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
    repoMocks.updatePeerAssessment.mockResolvedValue(expected);

    const result = await updateAssessmentAnswers(11, answers);

    expect(repoMocks.updatePeerAssessment).toHaveBeenCalledWith(11, answers);
    expect(result).toBe(expected);
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
