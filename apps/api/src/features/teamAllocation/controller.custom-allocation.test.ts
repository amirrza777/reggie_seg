import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  applyCustomAllocationHandler,
  getCustomAllocationCoverageHandler,
  listCustomAllocationQuestionnairesHandler,
  previewCustomAllocationHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  createTeamInvite: vi.fn(),
  listTeamInvites: vi.fn(),
  listReceivedInvites: vi.fn(),
  createTeam: vi.fn(),
  getTeamById: vi.fn(),
  addUserToTeam: vi.fn(),
  getTeamMembers: vi.fn(),
  acceptTeamInvite: vi.fn(),
  declineTeamInvite: vi.fn(),
  rejectTeamInvite: vi.fn(),
  cancelTeamInvite: vi.fn(),
  expireTeamInvite: vi.fn(),
  applyManualAllocationForProject: vi.fn(),
  applyRandomAllocationForProject: vi.fn(),
  applyCustomAllocationForProject: vi.fn(),
  getCustomAllocationCoverageForProject: vi.fn(),
  getManualAllocationWorkspaceForProject: vi.fn(),
  listCustomAllocationQuestionnairesForProject: vi.fn(),
  previewCustomAllocationForProject: vi.fn(),
  previewRandomAllocationForProject: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("teamAllocation controller custom allocation handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listCustomAllocationQuestionnairesHandler validates auth and project id", async () => {
    const unauthorizedReq: any = { user: undefined, params: { projectId: "4" } };
    const unauthorizedRes = mockResponse();
    await listCustomAllocationQuestionnairesHandler(unauthorizedReq, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badProjectReq: any = { user: { sub: 9 }, params: { projectId: "x" } };
    const badProjectRes = mockResponse();
    await listCustomAllocationQuestionnairesHandler(badProjectReq, badProjectRes);
    expect(badProjectRes.status).toHaveBeenCalledWith(400);
  });

  it("listCustomAllocationQuestionnairesHandler returns payload", async () => {
    (service.listCustomAllocationQuestionnairesForProject as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 1, moduleName: "Module A" },
      questionnaires: [],
    });
    const req: any = { user: { sub: 7 }, params: { projectId: "4" } };
    const res = mockResponse();

    await listCustomAllocationQuestionnairesHandler(req, res);

    expect(service.listCustomAllocationQuestionnairesForProject).toHaveBeenCalledWith(7, 4);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({ id: 4 }),
      }),
    );
  });

  it("getCustomAllocationCoverageHandler validates input", async () => {
    const unauthorizedReq: any = { user: undefined, params: { projectId: "4" }, query: { questionnaireTemplateId: "2" } };
    const unauthorizedRes = mockResponse();
    await getCustomAllocationCoverageHandler(unauthorizedReq, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badTemplateReq: any = { user: { sub: 7 }, params: { projectId: "4" }, query: { questionnaireTemplateId: "0" } };
    const badTemplateRes = mockResponse();
    await getCustomAllocationCoverageHandler(badTemplateReq, badTemplateRes);
    expect(badTemplateRes.status).toHaveBeenCalledWith(400);
  });

  it("previewCustomAllocationHandler validates and forwards payload", async () => {
    const invalidReq: any = {
      user: { sub: 7 },
      params: { projectId: "4" },
      body: {
        questionnaireTemplateId: 2,
        teamCount: 2,
        nonRespondentStrategy: "invalid",
        criteria: [],
      },
    };
    const invalidRes = mockResponse();
    await previewCustomAllocationHandler(invalidReq, invalidRes);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    (service.previewCustomAllocationForProject as any).mockResolvedValue({
      project: { id: 4, name: "Project A", moduleId: 1, moduleName: "Module A" },
      questionnaireTemplateId: 2,
      previewId: "p-1",
      generatedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      teamCount: 2,
      respondentCount: 8,
      nonRespondentCount: 1,
      nonRespondentStrategy: "distribute_randomly",
      criteriaSummary: [],
      teamCriteriaSummary: [],
      overallScore: 0.81,
      previewTeams: [],
    });
    const req: any = {
      user: { sub: 7 },
      params: { projectId: "4" },
      body: {
        questionnaireTemplateId: 2,
        teamCount: 2,
        seed: 123,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 4 }],
      },
    };
    const res = mockResponse();

    await previewCustomAllocationHandler(req, res);

    expect(service.previewCustomAllocationForProject).toHaveBeenCalledWith(7, 4, {
      questionnaireTemplateId: 2,
      teamCount: 2,
      seed: 123,
      nonRespondentStrategy: "distribute_randomly",
      criteria: [{ questionId: 11, strategy: "diversify", weight: 4 }],
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ previewId: "p-1" }));
  });

  it("applyCustomAllocationHandler validates and maps stale preview errors", async () => {
    const badReq: any = { user: { sub: 7 }, params: { projectId: "4" }, body: { previewId: " " } };
    const badRes = mockResponse();
    await applyCustomAllocationHandler(badReq, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.applyCustomAllocationForProject as any).mockRejectedValue({
      code: "PREVIEW_NOT_FOUND_OR_EXPIRED",
    });
    const staleReq: any = { user: { sub: 7 }, params: { projectId: "4" }, body: { previewId: "p-1" } };
    const staleRes = mockResponse();

    await applyCustomAllocationHandler(staleReq, staleRes);

    expect(staleRes.status).toHaveBeenCalledWith(409);
    expect(staleRes.json).toHaveBeenCalledWith({
      error: "Preview no longer exists. Generate a new preview and try again.",
    });
  });

  it("applyCustomAllocationHandler maps stale vacancy conflicts", async () => {
    (service.applyCustomAllocationForProject as any).mockRejectedValue({
      code: "STUDENTS_NO_LONGER_VACANT",
    });
    const req: any = { user: { sub: 7 }, params: { projectId: "4" }, body: { previewId: "p-1" } };
    const res = mockResponse();

    await applyCustomAllocationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Some students are no longer vacant. Regenerate preview and try again.",
    });
  });

  it("applyCustomAllocationHandler includes stale student details when provided", async () => {
    (service.applyCustomAllocationForProject as any).mockRejectedValue({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: [
        { id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" },
        { id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" },
      ],
    });
    const req: any = { user: { sub: 7 }, params: { projectId: "4" }, body: { previewId: "p-1" } };
    const res = mockResponse();

    await applyCustomAllocationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Some students are no longer vacant: Jin Johannesdottir, Sunil Stefansdottir. Regenerate preview and try again.",
      staleStudents: [
        { id: 11, firstName: "Jin", lastName: "Johannesdottir", email: "jin@example.com" },
        { id: 12, firstName: "Sunil", lastName: "Stefansdottir", email: "sunil@example.com" },
      ],
    });
  });
});