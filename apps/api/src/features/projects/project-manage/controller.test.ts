import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as repo from "./repo.js";
import {
  deleteStaffProjectManageHandler,
  getStaffProjectManageHandler,
  patchStaffProjectManageHandler,
} from "./controller.js";

vi.mock("./repo.js", () => ({
  getStaffProjectManageSummary: vi.fn(),
  patchStaffProjectManage: vi.fn(),
  deleteStaffProjectManage: vi.fn(),
  canStaffMutateProjectManageSettings: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

const manageRow = {
  id: 2,
  name: "P",
  archivedAt: null,
  moduleId: 5,
  informationText: null,
  questionnaireTemplateId: 10,
  questionnaireTemplate: { id: 10, templateName: "Peer form" },
  projectStudents: [] as { userId: number }[],
  module: {
    archivedAt: null,
    enterpriseId: "ent-1",
    moduleLeads: [] as { user: { id: number; email: string; firstName: string; lastName: string } }[],
    moduleTeachingAssistants: [] as { user: { id: number; email: string; firstName: string; lastName: string } }[],
    userModules: [] as { userId: number; user: { id: number; email: string; firstName: string; lastName: string } }[],
  },
  deadline: {
    taskOpenDate: new Date("2026-01-01T00:00:00.000Z"),
    taskDueDate: new Date("2026-01-10T00:00:00.000Z"),
    taskDueDateMcf: new Date("2026-01-12T00:00:00.000Z"),
    assessmentOpenDate: new Date("2026-01-11T00:00:00.000Z"),
    assessmentDueDate: new Date("2026-01-20T00:00:00.000Z"),
    assessmentDueDateMcf: new Date("2026-01-22T00:00:00.000Z"),
    feedbackOpenDate: new Date("2026-01-21T00:00:00.000Z"),
    feedbackDueDate: new Date("2026-01-28T00:00:00.000Z"),
    feedbackDueDateMcf: new Date("2026-01-30T00:00:00.000Z"),
    teamAllocationQuestionnaireOpenDate: null,
    teamAllocationQuestionnaireDueDate: null,
  },
  _count: { peerAssessments: 0 },
};

describe("project-manage controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStaffProjectManageHandler returns summary", async () => {
    (repo.getStaffProjectManageSummary as any).mockResolvedValueOnce(manageRow);
    (repo.canStaffMutateProjectManageSettings as any).mockResolvedValueOnce(true);
    const res = mockResponse();
    await getStaffProjectManageHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(repo.getStaffProjectManageSummary).toHaveBeenCalledWith(7, 2);
    expect(repo.canStaffMutateProjectManageSettings).toHaveBeenCalledWith(7, 5);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        name: "P",
        archivedAt: null,
        moduleId: 5,
        moduleArchivedAt: null,
        informationText: null,
        questionnaireTemplateId: 10,
        questionnaireTemplate: { id: 10, templateName: "Peer form" },
        projectDeadline: expect.objectContaining({
          taskOpenDate: "2026-01-01T00:00:00.000Z",
        }),
        hasSubmittedPeerAssessments: false,
        projectAccess: {
          moduleLeaders: [],
          moduleTeachingAssistants: [],
          moduleMemberDirectory: [],
          projectStudentIds: [],
        },
        canMutateProjectSettings: true,
      }),
    );
  });

  it("getStaffProjectManageHandler maps forbidden to 403", async () => {
    (repo.getStaffProjectManageSummary as any).mockRejectedValueOnce({
      code: "FORBIDDEN",
      message: "nope",
    });
    const res = mockResponse();
    await getStaffProjectManageHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("patchStaffProjectManageHandler validates archived type", async () => {
    const res = mockResponse();
    await patchStaffProjectManageHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { archived: "yes" },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("patchStaffProjectManageHandler rejects empty body", async () => {
    const res = mockResponse();
    await patchStaffProjectManageHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: {},
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("patchStaffProjectManageHandler updates name", async () => {
    (repo.patchStaffProjectManage as any).mockResolvedValueOnce(manageRow);
    const res = mockResponse();
    await patchStaffProjectManageHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { name: "New" },
      } as any,
      res,
    );
    expect(repo.patchStaffProjectManage).toHaveBeenCalledWith(7, 2, { name: "New" });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        name: "P",
        questionnaireTemplateId: 10,
        hasSubmittedPeerAssessments: false,
      }),
    );
  });

  it("deleteStaffProjectManageHandler returns moduleId", async () => {
    (repo.deleteStaffProjectManage as any).mockResolvedValueOnce({ moduleId: 9 });
    const res = mockResponse();
    await deleteStaffProjectManageHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(repo.deleteStaffProjectManage).toHaveBeenCalledWith(7, 2);
    expect(res.json).toHaveBeenCalledWith({ moduleId: 9 });
  });
});
