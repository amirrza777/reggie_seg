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
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("project-manage controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStaffProjectManageHandler returns summary", async () => {
    (repo.getStaffProjectManageSummary as any).mockResolvedValueOnce({
      id: 2,
      name: "P",
      archivedAt: null,
      moduleId: 5,
      module: { archivedAt: null },
    });
    const res = mockResponse();
    await getStaffProjectManageHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(repo.getStaffProjectManageSummary).toHaveBeenCalledWith(7, 2);
    expect(res.json).toHaveBeenCalledWith({
      id: 2,
      name: "P",
      archivedAt: null,
      moduleId: 5,
      moduleArchivedAt: null,
    });
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

  it("patchStaffProjectManageHandler updates name", async () => {
    (repo.patchStaffProjectManage as any).mockResolvedValueOnce({
      id: 2,
      name: "New",
      archivedAt: null,
      moduleId: 5,
      module: { archivedAt: null },
    });
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
    expect(res.json).toHaveBeenCalledWith({
      id: 2,
      name: "New",
      archivedAt: null,
      moduleId: 5,
      moduleArchivedAt: null,
    });
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
