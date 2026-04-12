import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  service: {
    applyCustomAllocationForProject: vi.fn(),
    getCustomAllocationCoverageForProject: vi.fn(),
    listCustomAllocationQuestionnairesForProject: vi.fn(),
    previewCustomAllocationForProject: vi.fn(),
  },
  sendProjectOrModuleArchivedConflict: vi.fn(),
}));

vi.mock("../service/service.js", () => ({
  applyCustomAllocationForProject: mocks.service.applyCustomAllocationForProject,
  getCustomAllocationCoverageForProject: mocks.service.getCustomAllocationCoverageForProject,
  listCustomAllocationQuestionnairesForProject: mocks.service.listCustomAllocationQuestionnairesForProject,
  previewCustomAllocationForProject: mocks.service.previewCustomAllocationForProject,
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  sendProjectOrModuleArchivedConflict: mocks.sendProjectOrModuleArchivedConflict,
}));

import {
  applyCustomAllocationHandler,
  getCustomAllocationCoverageHandler,
  listCustomAllocationQuestionnairesHandler,
  previewCustomAllocationHandler,
} from "./controller.custom-allocation.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

const previewBody = {
  questionnaireTemplateId: 3,
  teamCount: 2,
  nonRespondentStrategy: "exclude",
  criteria: [],
};

describe("controller custom-allocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValue(false);
    mocks.service.listCustomAllocationQuestionnairesForProject.mockResolvedValue({ questionnaires: [] });
    mocks.service.getCustomAllocationCoverageForProject.mockResolvedValue({ responseRate: 1 });
    mocks.service.previewCustomAllocationForProject.mockResolvedValue({ previewId: "p-1", teamCount: 2 });
    mocks.service.applyCustomAllocationForProject.mockResolvedValue({ previewId: "p-1", teamCount: 2 });
  });

  it("returns 401 when staff auth is missing", async () => {
    const res = createResponse();
    await listCustomAllocationQuestionnairesHandler({ user: undefined, params: { projectId: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for invalid project id in questionnaires listing", async () => {
    const res = createResponse();
    await listCustomAllocationQuestionnairesHandler({ user: { sub: 7 }, params: { projectId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns questionnaires payload from service on success", async () => {
    const res = createResponse();
    await listCustomAllocationQuestionnairesHandler({ user: { sub: 7 }, params: { projectId: "9" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ questionnaires: [] });
  });

  it("returns 400 for invalid project/template input", async () => {
    const res = createResponse();
    await getCustomAllocationCoverageHandler(
      { user: { sub: 1 }, params: { projectId: "x" }, query: { questionnaireTemplateId: "1" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when coverage template query param is invalid", async () => {
    const res = createResponse();
    await getCustomAllocationCoverageHandler(
      { user: { sub: 1 }, params: { projectId: "9" }, query: { questionnaireTemplateId: "bad" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns coverage payload from service on success", async () => {
    const res = createResponse();
    await getCustomAllocationCoverageHandler(
      { user: { sub: 1 }, params: { projectId: "9" }, query: { questionnaireTemplateId: "3" } } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({ responseRate: 1 });
  });

  it("listCustomAllocationQuestionnairesHandler maps service errors", async () => {
    const req = { user: { sub: 7 }, params: { projectId: "9" } };
    const notFound = createResponse();
    mocks.service.listCustomAllocationQuestionnairesForProject.mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    await listCustomAllocationQuestionnairesHandler(req as any, notFound);
    expect(notFound.status).toHaveBeenCalledWith(404);

    const forbidden = createResponse();
    mocks.service.listCustomAllocationQuestionnairesForProject.mockRejectedValueOnce({ code: "TEMPLATE_NOT_FOUND_OR_FORBIDDEN" });
    await listCustomAllocationQuestionnairesHandler(req as any, forbidden);
    expect(forbidden.status).toHaveBeenCalledWith(403);
  });

  it("listCustomAllocationQuestionnairesHandler maps 501 and 500", async () => {
    const req = { user: { sub: 7 }, params: { projectId: "9" } };
    const unavailable = createResponse();
    mocks.service.listCustomAllocationQuestionnairesForProject.mockRejectedValueOnce({ code: "CUSTOM_ALLOCATION_NOT_IMPLEMENTED" });
    await listCustomAllocationQuestionnairesHandler(req as any, unavailable);
    expect(unavailable.status).toHaveBeenCalledWith(501);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.listCustomAllocationQuestionnairesForProject.mockRejectedValueOnce(new Error("boom"));
    await listCustomAllocationQuestionnairesHandler(req as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("listCustomAllocationQuestionnairesHandler maps archived conflicts via project guard", async () => {
    const req = { user: { sub: 7 }, params: { projectId: "9" } };
    const res = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.listCustomAllocationQuestionnairesForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await listCustomAllocationQuestionnairesHandler(req as any, res);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
  });

  it("returns 401 for missing auth in coverage handler", async () => {
    const res = createResponse();
    await getCustomAllocationCoverageHandler(
      { user: undefined, params: { projectId: "9" }, query: { questionnaireTemplateId: "3" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns preview payload from service", async () => {
    const res = createResponse();
    await previewCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: previewBody } as any, res);
    expect(mocks.service.previewCustomAllocationForProject).toHaveBeenCalledWith(7, 9, expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ previewId: "p-1" }));
  });

  it("returns validation errors for invalid preview project id and body", async () => {
    const invalidProject = createResponse();
    await previewCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "x" }, body: previewBody } as any,
      invalidProject,
    );
    expect(invalidProject.status).toHaveBeenCalledWith(400);

    const invalidBody = createResponse();
    await previewCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "9" }, body: { ...previewBody, teamCount: 0 } } as any,
      invalidBody,
    );
    expect(invalidBody.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 for missing auth in preview handler", async () => {
    const res = createResponse();
    await previewCustomAllocationHandler({ user: undefined, params: { projectId: "9" }, body: previewBody } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it.each([
    ["INVALID_TEAM_COUNT", 400],
    ["INVALID_MIN_TEAM_SIZE", 400],
    ["INVALID_MAX_TEAM_SIZE", 400],
    ["INVALID_TEAM_SIZE_RANGE", 400],
    ["INVALID_TEMPLATE_ID", 400],
    ["INVALID_NON_RESPONDENT_STRATEGY", 400],
    ["INVALID_CRITERIA", 400],
    ["TEAM_COUNT_EXCEEDS_STUDENT_COUNT", 400],
    ["TEAM_SIZE_CONSTRAINTS_UNSATISFIABLE", 400],
    ["TEMPLATE_NOT_FOUND_OR_FORBIDDEN", 403],
    ["TEMPLATE_NOT_ALLOWED", 403],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
    ["NO_VACANT_STUDENTS", 409],
    ["CUSTOM_ALLOCATION_NOT_IMPLEMENTED", 501],
  ])("previewCustomAllocationHandler maps %s", async (code, status) => {
    const res = createResponse();
    mocks.service.previewCustomAllocationForProject.mockRejectedValueOnce({ code });
    await previewCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: previewBody } as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("previewCustomAllocationHandler maps archived and unexpected errors", async () => {
    const archived = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.previewCustomAllocationForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await previewCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: previewBody } as any, archived);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.previewCustomAllocationForProject.mockRejectedValueOnce(new Error("boom"));
    await previewCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: previewBody } as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it.each([
    ["INVALID_TEMPLATE_ID", 400],
    ["TEMPLATE_NOT_FOUND_OR_FORBIDDEN", 403],
    ["TEMPLATE_NOT_ALLOWED", 403],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
    ["CUSTOM_ALLOCATION_NOT_IMPLEMENTED", 501],
  ])("getCustomAllocationCoverageHandler maps %s", async (code, status) => {
    const res = createResponse();
    mocks.service.getCustomAllocationCoverageForProject.mockRejectedValueOnce({ code });
    await getCustomAllocationCoverageHandler(
      { user: { sub: 1 }, params: { projectId: "9" }, query: { questionnaireTemplateId: "3" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("getCustomAllocationCoverageHandler maps archived and unexpected errors", async () => {
    const archived = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.getCustomAllocationCoverageForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await getCustomAllocationCoverageHandler(
      { user: { sub: 1 }, params: { projectId: "9" }, query: { questionnaireTemplateId: "3" } } as any,
      archived,
    );
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.getCustomAllocationCoverageForProject.mockRejectedValueOnce(new Error("boom"));
    await getCustomAllocationCoverageHandler(
      { user: { sub: 1 }, params: { projectId: "9" }, query: { questionnaireTemplateId: "3" } } as any,
      failed,
    );
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("maps stale-student apply conflicts to 409", async () => {
    mocks.service.applyCustomAllocationForProject.mockRejectedValue({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: [{ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" }],
    });
    const res = createResponse();
    await applyCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 400 for invalid apply body payload", async () => {
    const res = createResponse();
    await applyCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401/400 for missing auth and invalid project in apply handler", async () => {
    const unauth = createResponse();
    await applyCustomAllocationHandler({ user: undefined, params: { projectId: "9" }, body: { previewId: "p-1" } } as any, unauth);
    expect(unauth.status).toHaveBeenCalledWith(401);

    const invalidProject = createResponse();
    await applyCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "x" }, body: { previewId: "p-1" } } as any,
      invalidProject,
    );
    expect(invalidProject.status).toHaveBeenCalledWith(400);
  });

  it("returns 201 when custom allocation apply succeeds", async () => {
    const res = createResponse();
    await applyCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ previewId: "p-1" }));
  });

  it("uses fallback stale-student message when names cannot be formatted", async () => {
    mocks.service.applyCustomAllocationForProject.mockRejectedValueOnce({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: [null],
    });
    const res = createResponse();
    await applyCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      error: "Some students are no longer vacant. Regenerate preview and try again.",
      staleStudents: [null],
    });
  });

  it("omits staleStudents from payload when staleStudents value is not an array", async () => {
    mocks.service.applyCustomAllocationForProject.mockRejectedValueOnce({
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents: "n/a",
    });
    const res = createResponse();
    await applyCustomAllocationHandler(
      { user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      error: "Some students are no longer vacant. Regenerate preview and try again.",
    });
  });

  it.each([
    ["INVALID_PREVIEW_ID", 400],
    ["INVALID_TEAM_NAMES", 400],
    ["DUPLICATE_TEAM_NAMES", 400],
    ["PREVIEW_NOT_FOUND_OR_EXPIRED", 409],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
    ["TEAM_NAME_ALREADY_EXISTS", 409],
    ["CUSTOM_ALLOCATION_NOT_IMPLEMENTED", 501],
  ])("applyCustomAllocationHandler maps %s", async (code, status) => {
    const res = createResponse();
    mocks.service.applyCustomAllocationForProject.mockRejectedValueOnce({ code });
    await applyCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("applyCustomAllocationHandler maps archived and unexpected errors", async () => {
    const archived = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.applyCustomAllocationForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await applyCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any, archived);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.applyCustomAllocationForProject.mockRejectedValueOnce(new Error("boom"));
    await applyCustomAllocationHandler({ user: { sub: 7 }, params: { projectId: "9" }, body: { previewId: "p-1" } } as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});
