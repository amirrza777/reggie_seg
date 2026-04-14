import type { Response } from "express";
import { vi } from "vitest";

const hoistedServiceMocks = vi.hoisted(() => ({
  fetchTeammates: vi.fn(),
  saveAssessment: vi.fn(),
  fetchAssessment: vi.fn(),
  updateAssessmentAnswers: vi.fn(),
  fetchTeammateAssessments: vi.fn(),
  fetchQuestionsForProject: vi.fn(),
  fetchAssessmentById: vi.fn(),
  fetchProjectQuestionnaireTemplate: vi.fn(),
}));

export const serviceMocks = {
  fetchTeammates: hoistedServiceMocks.fetchTeammates,
  saveAssessment: hoistedServiceMocks.saveAssessment,
  fetchAssessment: hoistedServiceMocks.fetchAssessment,
  updateAssessmentAnswers: hoistedServiceMocks.updateAssessmentAnswers,
  fetchTeammateAssessments: hoistedServiceMocks.fetchTeammateAssessments,
  fetchQuestionsForProject: hoistedServiceMocks.fetchQuestionsForProject,
  fetchAssessmentById: hoistedServiceMocks.fetchAssessmentById,
  fetchProjectQuestionnaireTemplate: hoistedServiceMocks.fetchProjectQuestionnaireTemplate,
};

vi.mock("./service.js", () => ({
  fetchTeammates: serviceMocks.fetchTeammates,
  saveAssessment: serviceMocks.saveAssessment,
  fetchAssessment: serviceMocks.fetchAssessment,
  updateAssessmentAnswers: serviceMocks.updateAssessmentAnswers,
  fetchTeammateAssessments: serviceMocks.fetchTeammateAssessments,
  fetchQuestionsForProject: serviceMocks.fetchQuestionsForProject,
  fetchAssessmentById: serviceMocks.fetchAssessmentById,
  fetchProjectQuestionnaireTemplate: serviceMocks.fetchProjectQuestionnaireTemplate,
}));

vi.mock("./services/PeerAssessmentService.js", () => ({
  PeerAssessmentService: vi.fn().mockImplementation(() => ({})),
}));

export {
  createAssessmentHandler,
  getAssessmentByIdHandler,
  getAssessmentHandler,
  getAssessmentsHandler,
  getProjectQuestionnaireTemplateHandler,
  getQuestionsForProjectHandler,
  getTeammatesHandler,
  updateAssessmentHandler,
} from "./controller.js";

export function createMockResponse() {
  const res = {} as Partial<Response> & {
    statusCode?: number;
    body?: unknown;
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as Response["status"];

  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as Response["json"];

  return res as Response & { statusCode?: number; body?: unknown };
}
