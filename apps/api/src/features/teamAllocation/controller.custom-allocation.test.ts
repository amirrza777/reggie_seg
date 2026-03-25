import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  applyCustomAllocationHandler,
  getCustomAllocationCoverageHandler,
  listCustomAllocationQuestionnairesHandler,
  previewCustomAllocationHandler,
} from "./controller.custom-allocation.js";

vi.mock("./service.js", () => ({
  applyCustomAllocationForProject: vi.fn(),
  getCustomAllocationCoverageForProject: vi.fn(),
  listCustomAllocationQuestionnairesForProject: vi.fn(),
  previewCustomAllocationForProject: vi.fn(),
}));

function createResponse() {
  const res: Partial<Response> = { status: vi.fn(), json: vi.fn() };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

describe("controller custom-allocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when staff auth is missing", async () => {
    const res = createResponse();
    await listCustomAllocationQuestionnairesHandler({ user: undefined, params: { projectId: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for invalid project/template input", async () => {
    const res = createResponse();
    await getCustomAllocationCoverageHandler(
      { user: { sub: 1 }, params: { projectId: "x" }, query: { questionnaireTemplateId: "1" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns preview payload from service", async () => {
    (service.previewCustomAllocationForProject as any).mockResolvedValue({ previewId: "p-1", teamCount: 2 });
    const res = createResponse();
    await previewCustomAllocationHandler(
      {
        user: { sub: 7 },
        params: { projectId: "9" },
        body: {
          questionnaireTemplateId: 3,
          teamCount: 2,
          nonRespondentStrategy: "exclude",
          criteria: [],
        },
      } as any,
      res,
    );
    expect(service.previewCustomAllocationForProject).toHaveBeenCalledWith(7, 9, expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ previewId: "p-1" }));
  });

  it("maps stale-student apply conflicts to 409", async () => {
    (service.applyCustomAllocationForProject as any).mockRejectedValue({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: [{ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" }],
    });
    const res = createResponse();
    await applyCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(409);
  });
});